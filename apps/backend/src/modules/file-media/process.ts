import { randomUUID } from "node:crypto"
import path from "node:path"

import { MedusaError } from "@medusajs/framework/utils"
import sharp from "sharp"

// What happens to an upload before it is stored: a safe file name, and for
// photos an optional resize and conversion to WebP.

export type MediaOptions = {
  naming: "slug" | "uuid" | "original"
  webp: boolean
  /** Longest side in pixels; 0 = keep the size. */
  maxDimension: number
  maxBytes: number
}

const RASTER = new Set(["image/jpeg", "image/png", "image/webp"])

/** Latin letters, digits and dashes only; Arabic and spaces become dashes. */
export const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

/** A unique object name; a timestamp-based suffix keeps names from colliding. */
export function objectName(filename: string, naming: MediaOptions["naming"], ext: string) {
  const base = path.posix.parse(path.posix.basename(filename.replace(/\\/g, "/"))).name
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  if (naming === "uuid") return `${randomUUID()}${ext}`
  if (naming === "original") {
    const safe = base.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80)
    return `${safe || "file"}-${unique}${ext}`
  }
  return `${slugify(base) || "file"}-${unique}${ext}`
}

export async function prepareUpload(
  input: { filename: string; mimeType: string; content: Buffer },
  options: MediaOptions
): Promise<{ name: string; type: string; content: Buffer }> {
  if (input.content.length > options.maxBytes) {
    const mb = Math.round((options.maxBytes / 1024 / 1024) * 10) / 10
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `الملف أكبر من الحد المسموح (${mb} MB)`)
  }
  let content = input.content
  let type = input.mimeType || "application/octet-stream"
  let ext = path.extname(input.filename).toLowerCase()

  if (RASTER.has(type) && (options.webp || options.maxDimension > 0)) {
    let image = sharp(content, { failOn: "error" }).rotate()
    if (options.maxDimension > 0) {
      image = image.resize({ width: options.maxDimension, height: options.maxDimension, fit: "inside", withoutEnlargement: true })
    }
    if (options.webp) {
      image = image.webp({ quality: 82 })
      type = "image/webp"
      ext = ".webp"
    }
    content = await image.toBuffer()
  }
  return { name: objectName(input.filename, options.naming, ext), type, content }
}
