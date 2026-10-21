import { readFile } from "node:fs/promises"
import { basename, extname, join } from "node:path"

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createProductsWorkflow, updateProductsWorkflow, uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

import { updateProductCatalogWorkflow } from "../catalog/product-catalog"
import { aiEditImage, aiStartVideo, aiVideoContent, aiVideoStatus } from "./ai"
import { fetchImage } from "./source"

// Saving an AI-made product (as a draft by default) and its media: official
// photos copied to the store's storage, AI-edited photos, and an optional
// video. Text and specs are whatever the admin approved in the review step.

type Query = { graph: (q: Record<string, unknown>) => Promise<{ data: unknown[] }> }
const queryOf = (c: MedusaContainer) => c.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" }

/** Puts a file in the store's storage (S3 or local) and returns its public URL. */
export async function storeFile(container: MedusaContainer, name: string, file: { bytes: Buffer; type: string }) {
  const { result } = await uploadFilesWorkflow(container).run({
    input: {
      files: [{ filename: `${name}.${EXT[file.type] ?? "bin"}`, mimeType: file.type, content: file.bytes.toString("base64"), access: "public" }],
    },
  })
  return result[0].url
}

/** Copies official photos into the store's storage, so they never disappear with the vendor's site. */
export async function importImages(container: MedusaContainer, urls: string[], handle: string) {
  const out: { source: string; url?: string; error?: string }[] = []
  for (const [i, source] of urls.slice(0, 12).entries()) {
    try {
      out.push({ source, url: await storeFile(container, `${handle}-${i + 1}`, await fetchImage(source)) })
    } catch (error) {
      out.push({ source, error: (error as Error).message })
    }
  }
  return out
}

const ENHANCE: Record<"white" | "lifestyle", (title: string) => string> = {
  white: (title) =>
    `Product photo of "${title}" for an online store. Keep the product exactly as it is: same shape, ports, buttons, logo and text, no new parts. Remove the background and place it centered on a pure white background with a soft natural shadow. Square image.`,
  lifestyle: (title) =>
    `Marketing photo of "${title}". Keep the product exactly as it is: same shape, ports, buttons, logo and text, no new parts and no extra devices. Place it in a tasteful, realistic modern Kuwaiti home or office setting with soft daylight. No people, no text, no watermark.`,
}

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }

/** Reads a photo for editing: from our own storage directly, or from a public site. */
async function loadImage(url: string) {
  const local = `${(process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "")}/static/`
  if (url.startsWith(local)) {
    // Local file storage: only a file name inside ./static, never a path.
    const name = basename(decodeURIComponent(url.slice(local.length).split("?")[0]))
    const type = TYPES[extname(name).slice(1).toLowerCase()]
    if (!type) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Not an image")
    return { bytes: await readFile(join(process.cwd(), "static", name)), type }
  }
  const bucket = (process.env.S3_FILE_URL ?? "").replace(/\/$/, "")
  if (bucket && url.startsWith(`${bucket}/`)) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    const type = (res.headers.get("content-type") ?? "").split(";")[0]
    if (!res.ok || !type.startsWith("image/")) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Could not read the image (${res.status})`)
    return { bytes: Buffer.from(await res.arrayBuffer()), type }
  }
  return fetchImage(url)
}

export async function enhanceImage(container: MedusaContainer, input: { image_url: string; style: "white" | "lifestyle"; title: string; handle: string }) {
  const edited = await aiEditImage(container, ENHANCE[input.style](input.title), await loadImage(input.image_url))
  return storeFile(container, `${input.handle}-${input.style}-${Date.now()}`, edited)
}

export type CreateInput = {
  handle: string
  status: "draft" | "published"
  category_id: string | null
  brand_id: string | null
  addon_group_ids: string[]
  price_kwd: number
  sku?: string | null
  variants: { option_ar: string; values: { value: string; price_kwd: number; sku?: string | null }[] } | null
  images: string[]
  content: {
    title_ar: string
    title_en?: string
    subtitle_ar?: string
    subtitle_en?: string
    description_ar?: string
    description_en?: string
    highlights_ar?: string[]
    highlights_en?: string[]
    faq?: { question_ar: string; answer_ar: string; question_en: string; answer_en: string }[]
    seo_title_ar?: string
    seo_title_en?: string
    seo_description_ar?: string
    seo_description_en?: string
    mpn?: string | null
    warranty_months?: number | null
  }
  specs: Record<string, unknown>
  source_url?: string | null
}

async function freeHandle(query: Query, handle: string) {
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? handle : `${handle}-${n}`
    const { data } = await query.graph({ entity: "product", fields: ["id"], filters: { handle: candidate } })
    if (!data.length) return candidate
  }
  return `${handle}-${Date.now()}`
}

export async function createAiProduct(container: MedusaContainer, input: CreateInput) {
  const query = queryOf(container)
  const handle = await freeHandle(query, input.handle)
  const { data: stores } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
  const channel = (stores[0] as { default_sales_channel_id?: string | null } | undefined)?.default_sales_channel_id

  const option = input.variants?.option_ar || "Default"
  const values = input.variants?.values.length ? input.variants.values : [{ value: "Default", price_kwd: input.price_kwd, sku: input.sku }]
  const c = input.content

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: c.title_ar,
          subtitle: c.subtitle_ar || undefined,
          description: c.description_ar || undefined,
          handle,
          status: input.status,
          ...(input.category_id ? { category_ids: [input.category_id] } : {}),
          images: input.images.map((url) => ({ url })),
          thumbnail: input.images[0],
          options: [{ title: option, values: values.map((v) => v.value) }],
          variants: values.map((v) => ({
            title: v.value,
            sku: v.sku || undefined,
            manage_inventory: false,
            options: { [option]: v.value },
            prices: [{ amount: v.price_kwd, currency_code: "kwd" }],
          })),
          ...(channel ? { sales_channels: [{ id: channel }] } : {}),
          metadata: { created_with_ai: true, ...(input.source_url ? { source_url: input.source_url } : {}) },
        },
      ],
    },
  })
  const product = result[0]

  await updateProductCatalogWorkflow(container).run({
    input: {
      product_id: product.id,
      brand_id: input.brand_id ?? undefined,
      addon_group_ids: input.addon_group_ids,
      detail: {
        title_en: c.title_en || null,
        subtitle_ar: c.subtitle_ar || null,
        subtitle_en: c.subtitle_en || null,
        description_en: c.description_en || null,
        highlights_ar: c.highlights_ar?.length ? c.highlights_ar : null,
        highlights_en: c.highlights_en?.length ? c.highlights_en : null,
        specs: Object.keys(input.specs).length ? input.specs : null,
        faq: c.faq?.length ? c.faq : null,
        seo_title_ar: c.seo_title_ar || null,
        seo_title_en: c.seo_title_en || null,
        seo_description_ar: c.seo_description_ar || null,
        seo_description_en: c.seo_description_en || null,
        mpn: c.mpn || null,
        warranty_months: c.warranty_months ?? null,
        source_url: input.source_url?.startsWith("https://") ? input.source_url : null,
      },
    },
  })
  return { id: product.id, handle }
}

// --- video ---------------------------------------------------------------------

type VideoMeta = { job_id: string; status: string; url?: string; error?: string }

async function productMeta(container: MedusaContainer, id: string) {
  const { data } = await queryOf(container).graph({ entity: "product", fields: ["id", "title", "handle", "thumbnail", "metadata"], filters: { id } })
  const p = data[0] as { id: string; title: string; handle: string; thumbnail?: string | null; metadata?: Record<string, unknown> | null } | undefined
  if (!p) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
  return p
}

const saveVideo = (container: MedusaContainer, p: { id: string; metadata?: Record<string, unknown> | null }, video: VideoMeta) =>
  updateProductsWorkflow(container).run({ input: { selector: { id: p.id }, update: { metadata: { ...(p.metadata ?? {}), ai_video: video } } } })

const VIDEO_PROMPT = (title: string) =>
  `Short product video of "${title}". Slow, smooth camera orbit around the product on a clean studio background with soft light. Keep the product exactly as in the image: same shape, ports, logo and text. No people, no text overlays.`

export async function startProductVideo(container: MedusaContainer, productId: string, imageUrl?: string | null) {
  const p = await productMeta(container, productId)
  const source = imageUrl || p.thumbnail
  if (!source) throw new MedusaError(MedusaError.Types.INVALID_DATA, "The product has no image to start the video from")
  const job = await aiStartVideo(container, VIDEO_PROMPT(p.title), await loadImage(source))
  const video = { job_id: job.id, status: job.status }
  await saveVideo(container, p, video)
  return video
}

/** Checks the job; when done, keeps the video in our storage and on the product. */
export async function refreshProductVideo(container: MedusaContainer, productId: string) {
  const p = await productMeta(container, productId)
  const current = p.metadata?.ai_video as VideoMeta | undefined
  if (!current?.job_id || current.status === "completed" || current.status === "failed") return current ?? null
  const job = await aiVideoStatus(container, current.job_id)
  let video: VideoMeta = { job_id: current.job_id, status: job.status, ...(job.error ? { error: job.error } : {}) }
  if (job.status === "completed") {
    const url = await storeFile(container, `${p.handle}-video-${Date.now()}`, await aiVideoContent(container, current.job_id))
    video = { ...video, url }
  }
  if (video.status !== current.status || video.url) await saveVideo(container, p, video)
  return video
}

/** Shows the reviewed video on the storefront product page, or hides it. */
export async function publishProductVideo(container: MedusaContainer, productId: string, publish: boolean) {
  const p = await productMeta(container, productId)
  const video = p.metadata?.ai_video as VideoMeta | undefined
  if (publish && !video?.url) throw new MedusaError(MedusaError.Types.INVALID_DATA, "The video is not ready yet")
  await updateProductsWorkflow(container).run({
    input: { selector: { id: p.id }, update: { metadata: { ...(p.metadata ?? {}), video_url: publish ? video!.url : null } } },
  })
  return { video_url: publish ? video!.url : null }
}
