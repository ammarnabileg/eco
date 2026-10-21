import { z } from "@medusajs/framework/zod"

const size = z.enum(["square", "post", "story", "banner"])
const price = z
  .object({
    amount: z.number(),
    original_amount: z.number(),
    currency_code: z.string().min(3).max(3),
    price_list_id: z.string().nullable(),
    ends_at: z.string().nullable(),
  })
  .strict()

export const SaveBanner = z
  .object({
    title: z.string().trim().min(1).max(120),
    product_id: z.string().startsWith("prod_").nullish(),
    background_url: z.string().url().nullish(),
    product_image_url: z.string().url().nullish(),
    canvas_width: z.number().int().min(200).max(4000),
    canvas_height: z.number().int().min(200).max(4000),
    elements: z.record(z.string(), z.unknown()),
    language: z.enum(["ar", "en", "both"]),
    price_snapshot: price.nullish(),
  })
  .strict()

export const ApproveBanner = z.object({ output_url: z.string().url() }).strict()
export const PublishSlide = z
  .object({ banner_id: z.string(), mobile_banner_id: z.string().nullish(), cta_url: z.string().max(500).nullish() })
  .strict()
export const GenerateBackground = z
  .object({ size, style: z.enum(["tech", "clean", "warm", "home"]), prompt: z.string().max(300).nullish() })
  .strict()
export const AdCopy = z.object({ product_id: z.string().startsWith("prod_").nullish(), brief: z.string().max(500).nullish() }).strict()

export type SaveBannerType = z.infer<typeof SaveBanner>
export type ApproveBannerType = z.infer<typeof ApproveBanner>
export type PublishSlideType = z.infer<typeof PublishSlide>
export type GenerateBackgroundType = z.infer<typeof GenerateBackground>
export type AdCopyType = z.infer<typeof AdCopy>
