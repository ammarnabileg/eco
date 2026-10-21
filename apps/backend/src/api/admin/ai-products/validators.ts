import { z } from "@medusajs/framework/zod"

const url = z.string().url().max(2000)
const handle = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100)
const price = z.number().positive().max(100_000)

export const DraftAiProduct = z
  .object({
    name: z.string().trim().min(2).max(200),
    brand: z.string().trim().max(80).nullish(),
    category_id: z.string().max(100).nullish(),
    source_url: url.startsWith("https://").nullish(),
    source_text: z.string().max(60_000).nullish(),
    price_kwd: price.nullish(),
    notes: z.string().max(2000).nullish(),
  })
  .strict()

export const ImportAiImages = z.object({ urls: z.array(url).min(1).max(12), handle }).strict()

export const EnhanceAiImage = z
  .object({ image_url: url, style: z.enum(["white", "lifestyle"]), title: z.string().trim().min(1).max(200), handle })
  .strict()

const faq = z.object({ question_ar: z.string().min(1), answer_ar: z.string().min(1), question_en: z.string().min(1), answer_en: z.string().min(1) }).strict()

export const CreateAiProduct = z
  .object({
    handle,
    status: z.enum(["draft", "published"]).default("draft"),
    category_id: z.string().nullable(),
    brand_id: z.string().nullable(),
    addon_group_ids: z.array(z.string()).max(20).default([]),
    price_kwd: price,
    sku: z.string().max(80).nullish(),
    variants: z
      .object({
        option_ar: z.string().trim().min(1).max(60),
        values: z.array(z.object({ value: z.string().trim().min(1).max(60), price_kwd: price, sku: z.string().max(80).nullish() }).strict()).min(2).max(20),
      })
      .strict()
      .nullable(),
    images: z.array(url).min(1).max(20),
    content: z
      .object({
        title_ar: z.string().trim().min(1).max(200),
        title_en: z.string().max(300).optional(),
        subtitle_ar: z.string().max(300).optional(),
        subtitle_en: z.string().max(300).optional(),
        description_ar: z.string().max(20000).optional(),
        description_en: z.string().max(20000).optional(),
        highlights_ar: z.array(z.string().min(1).max(300)).max(12).optional(),
        highlights_en: z.array(z.string().min(1).max(300)).max(12).optional(),
        faq: z.array(faq).max(20).optional(),
        seo_title_ar: z.string().max(70).optional(),
        seo_title_en: z.string().max(70).optional(),
        seo_description_ar: z.string().max(170).optional(),
        seo_description_en: z.string().max(170).optional(),
        mpn: z.string().max(80).nullish(),
        warranty_months: z.number().int().min(0).max(120).nullish(),
      })
      .strict(),
    specs: z.record(z.string(), z.unknown()).default({}),
    source_url: z.string().max(2000).nullish(),
  })
  .strict()

export const PublishAiVideo = z.object({ publish: z.boolean() }).strict()
export const StartAiVideo = z.object({ image_url: url.nullish() }).strict()

export type DraftAiProductType = z.infer<typeof DraftAiProduct>
export type ImportAiImagesType = z.infer<typeof ImportAiImages>
export type EnhanceAiImageType = z.infer<typeof EnhanceAiImage>
export type CreateAiProductType = z.infer<typeof CreateAiProduct>
export type StartAiVideoType = z.infer<typeof StartAiVideo>
export type PublishAiVideoType = z.infer<typeof PublishAiVideo>
