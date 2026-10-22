import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { FileTypes, Logger } from "@medusajs/framework/types"
import { AbstractFileProviderService, MedusaError } from "@medusajs/framework/utils"
import { createReadStream, createWriteStream } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { PassThrough, Readable } from "node:stream"

import { IntegrationValues } from "../integrations/definitions"
import { readIntegration } from "../integrations/store"
import { MediaOptions, objectName, prepareUpload } from "./process"

type Options = { upload_dir?: string; backend_url?: string }
type Container = { logger: Logger; __pg_connection__?: Parameters<typeof readIntegration>[0] }
type Remote = { client: S3Client; bucket: string; publicUrl: string; prefix: string }

const LOCAL_PREFIX = "local/"

// Upload content arrives as base64, UTF-8 text (CSV imports) or a binary
// string; same rules as Medusa's own providers.
function decodeContent(content: string, mimeType?: string) {
  const b64 = Buffer.from(content, "base64")
  if (b64.toString("base64") === content) return b64
  const text = mimeType?.startsWith("text/") || /csv|json|xml/.test(mimeType ?? "")
  return Buffer.from(content, text ? "utf8" : "binary")
}

// Medusa's file provider for the whole store. Where files go is read from the
// admin's Integrations page on every upload (Cloudflare R2 when switched on,
// the server's ./static folder otherwise), so storage can change without a
// restart. Each file key says where the file lives, so files uploaded before
// a switch keep working and can still be deleted.
export default class MediaFileService extends AbstractFileProviderService {
  static identifier = "media"
  private readonly logger_: Logger
  private readonly pg_: Container["__pg_connection__"]
  private readonly uploadDir_: string
  private readonly backendUrl_: string
  private remote_: { signature: string; remote: Remote } | null = null

  constructor(container: Container, options: Options = {}) {
    super()
    this.logger_ = container.logger
    this.pg_ = container.__pg_connection__
    this.uploadDir_ = path.resolve(options.upload_dir ?? "static")
    this.backendUrl_ = (options.backend_url ?? "http://localhost:9000/static").replace(/\/$/, "")
  }

  private async settings() {
    const s = await readIntegration(this.pg_, "media")
    const v = s.values
    const num = (x: IntegrationValues[string], d: number) => (Number.isFinite(Number(x)) && String(x ?? "").trim() !== "" ? Number(x) : d)
    const options: MediaOptions = {
      naming: (["slug", "uuid", "original"].includes(String(v.naming)) ? v.naming : "slug") as MediaOptions["naming"],
      webp: v.webp !== "off",
      maxDimension: Math.max(0, num(v.max_dimension, 0)),
      maxBytes: Math.max(1, num(v.max_upload_mb, 20)) * 1024 * 1024,
    }
    return { active: s.active, values: v, options }
  }

  private remote(values: IntegrationValues): Remote {
    const str = (k: string) => String(values[k] ?? "").trim()
    const signature = ["access_key_id", "secret_access_key", "bucket", "endpoint", "public_url", "prefix"].map(str).join("|")
    if (this.remote_?.signature !== signature) {
      const client = new S3Client({
        region: "auto",
        endpoint: str("endpoint"),
        forcePathStyle: true,
        credentials: { accessKeyId: str("access_key_id"), secretAccessKey: str("secret_access_key") },
      })
      // Never empty: the "/" in a key is how R2 files are told apart from disk ones.
      const prefix = str("prefix").replace(/^\/+|\/+$/g, "") || "media"
      this.remote_ = {
        signature,
        remote: { client, bucket: str("bucket"), publicUrl: str("public_url").replace(/\/+$/, ""), prefix: `${prefix}/` },
      }
    }
    return this.remote_.remote
  }

  private localPath(key: string) {
    const name = key.startsWith(LOCAL_PREFIX) ? key.slice(LOCAL_PREFIX.length) : key
    const resolved = path.resolve(this.uploadDir_, name)
    if (path.relative(this.uploadDir_, resolved).startsWith("..")) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Invalid file key: ${key}`)
    }
    return resolved
  }

  // Files saved before this provider (plain names in ./static) and local ones are on disk.
  private isLocal(key: string) {
    return key.startsWith(LOCAL_PREFIX) || !key.includes("/")
  }

  async upload(file: FileTypes.ProviderUploadFileDTO): Promise<FileTypes.ProviderFileResultDTO> {
    if (!file?.filename) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No file provided")
    const { active, values, options } = await this.settings()
    const raw = decodeContent(file.content, file.mimeType)
    const prepared = await prepareUpload({ filename: file.filename, mimeType: file.mimeType, content: raw }, options)

    if (active) {
      const r = this.remote(values)
      const key = `${r.prefix}${prepared.name}`
      await r.client.send(
        new PutObjectCommand({
          Bucket: r.bucket,
          Key: key,
          Body: prepared.content,
          ContentType: prepared.type,
          CacheControl: "public, max-age=31536000, immutable",
        })
      )
      return { key, url: `${r.publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}` }
    }

    await fs.mkdir(this.uploadDir_, { recursive: true })
    await fs.writeFile(this.localPath(prepared.name), prepared.content)
    return { key: `${LOCAL_PREFIX}${prepared.name}`, url: `${this.backendUrl_}/${encodeURIComponent(prepared.name)}` }
  }

  // Exports (CSV) are written as a stream; R2 gets the whole file at the end.
  async getUploadStream(fileData: FileTypes.ProviderUploadStreamDTO) {
    if (!fileData?.filename) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    const { active, values, options } = await this.settings()
    const name = objectName(fileData.filename, options.naming, path.extname(fileData.filename).toLowerCase())

    if (!active) {
      await fs.mkdir(this.uploadDir_, { recursive: true })
      const writeStream = createWriteStream(this.localPath(name))
      const result = { key: `${LOCAL_PREFIX}${name}`, url: `${this.backendUrl_}/${encodeURIComponent(name)}` }
      const promise = new Promise<FileTypes.ProviderFileResultDTO>((resolve, reject) => {
        writeStream.on("finish", () => resolve(result))
        writeStream.on("error", reject)
      })
      return { writeStream, promise, url: result.url, fileKey: result.key }
    }

    const r = this.remote(values)
    const key = `${r.prefix}${name}`
    const url = `${r.publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`
    const writeStream = new PassThrough()
    const chunks: Buffer[] = []
    writeStream.on("data", (c: Buffer) => chunks.push(c))
    const promise = new Promise<FileTypes.ProviderFileResultDTO>((resolve, reject) => {
      writeStream.on("end", () => {
        r.client
          .send(new PutObjectCommand({ Bucket: r.bucket, Key: key, Body: Buffer.concat(chunks), ContentType: fileData.mimeType }))
          .then(() => resolve({ key, url }), reject)
      })
      writeStream.on("error", reject)
    })
    return { writeStream, promise, url, fileKey: key }
  }

  // Imports: the admin uploads the CSV straight to R2, or to /admin/uploads on disk.
  async getPresignedUploadUrl(fileData: FileTypes.ProviderGetPresignedUploadUrlDTO): Promise<FileTypes.ProviderFileResultDTO> {
    if (!fileData?.filename) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    const { active, values, options } = await this.settings()
    if (!active) return { url: "/admin/uploads", key: fileData.filename }
    const r = this.remote(values)
    const key = `${r.prefix}uploads/${objectName(fileData.filename, options.naming, path.extname(fileData.filename).toLowerCase())}`
    const url = await getSignedUrl(
      r.client,
      new PutObjectCommand({ Bucket: r.bucket, Key: key, ContentType: fileData.mimeType }),
      { expiresIn: fileData.expiresIn ?? 3600 }
    )
    return { url, key }
  }

  async delete(files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]): Promise<void> {
    const list = Array.isArray(files) ? files : [files]
    for (const f of list) {
      if (this.isLocal(f.fileKey)) {
        await fs.unlink(this.localPath(f.fileKey)).catch((e: NodeJS.ErrnoException) => {
          if (e.code !== "ENOENT") throw e
        })
        continue
      }
      const { values } = await this.settings()
      if (!values.bucket) {
        this.logger_.warn(`Media: cannot delete ${f.fileKey}, R2 is not configured`)
        continue
      }
      const r = this.remote(values)
      await r.client.send(new DeleteObjectCommand({ Bucket: r.bucket, Key: f.fileKey }))
    }
  }

  async getPresignedDownloadUrl(file: FileTypes.ProviderGetFileDTO): Promise<string> {
    if (this.isLocal(file.fileKey)) {
      const name = file.fileKey.startsWith(LOCAL_PREFIX) ? file.fileKey.slice(LOCAL_PREFIX.length) : file.fileKey
      return `${this.backendUrl_}/${encodeURIComponent(name)}`
    }
    const r = this.remote((await this.settings()).values)
    return getSignedUrl(r.client, new GetObjectCommand({ Bucket: r.bucket, Key: file.fileKey }), { expiresIn: 3600 })
  }

  async getAsBuffer(file: FileTypes.ProviderGetFileDTO): Promise<Buffer> {
    if (this.isLocal(file.fileKey)) return fs.readFile(this.localPath(file.fileKey))
    const r = this.remote((await this.settings()).values)
    const res = await r.client.send(new GetObjectCommand({ Bucket: r.bucket, Key: file.fileKey }))
    return Buffer.from(await res.Body!.transformToByteArray())
  }

  async getDownloadStream(file: FileTypes.ProviderGetFileDTO): Promise<Readable> {
    if (this.isLocal(file.fileKey)) return createReadStream(this.localPath(file.fileKey))
    return Readable.from(await this.getAsBuffer(file))
  }
}
