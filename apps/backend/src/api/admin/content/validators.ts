import { z } from "@medusajs/framework/zod"

const optionalText = z.string().trim().max(500).nullish()

export const UpdateSiteSettings = z
  .object({
    whatsapp: z
      .string()
      .regex(/^\+?[0-9 ]{6,20}$/, "Phone number digits only")
      .nullish(),
    phone: z
      .string()
      .regex(/^\+?[0-9 ]{6,20}$/, "Phone number digits only")
      .nullish(),
    email: z.string().email().nullish(),
    address_ar: optionalText,
    address_en: optionalText,
    hours_ar: optionalText,
    hours_en: optionalText,
  })
  .strict()
export type UpdateSiteSettingsType = z.infer<typeof UpdateSiteSettings>

const heroSlideFields = {
  eyebrow_ar: optionalText,
  eyebrow_en: optionalText,
  title_ar: z.string().trim().min(1).max(200),
  title_en: z.string().trim().min(1).max(200),
  highlight_ar: optionalText,
  highlight_en: optionalText,
  subtitle_ar: optionalText,
  subtitle_en: optionalText,
  cta_label_ar: optionalText,
  cta_label_en: optionalText,
  // Relative store paths ("/store") or https links only.
  cta_url: z
    .string()
    .regex(/^(\/[^\s]*|https:\/\/[^\s]+)$/, "Use a /path or an https:// link")
    .nullish(),
  image_url: z.string().url().startsWith("https://").nullish(),
  rank: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  starts_at: z.coerce.date().nullish(),
  ends_at: z.coerce.date().nullish(),
}

const endsAfterStart = (v: { starts_at?: Date | null; ends_at?: Date | null }) =>
  !v.starts_at || !v.ends_at || v.ends_at > v.starts_at

export const CreateHeroSlide = z
  .object(heroSlideFields)
  .strict()
  .refine(endsAfterStart, { message: "ends_at must be after starts_at" })
export type CreateHeroSlideType = z.infer<typeof CreateHeroSlide>

export const UpdateHeroSlide = z
  .object(heroSlideFields)
  .partial()
  .strict()
  .refine(endsAfterStart, { message: "ends_at must be after starts_at" })
export type UpdateHeroSlideType = z.infer<typeof UpdateHeroSlide>

const trustBadgeFields = {
  icon: z.string().trim().min(1).max(40),
  title_ar: z.string().trim().min(1).max(80),
  title_en: z.string().trim().min(1).max(80),
  subtitle_ar: optionalText,
  subtitle_en: optionalText,
  rank: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
}

export const CreateTrustBadge = z.object(trustBadgeFields).strict()
export type CreateTrustBadgeType = z.infer<typeof CreateTrustBadge>

export const UpdateTrustBadge = z.object(trustBadgeFields).partial().strict()
export type UpdateTrustBadgeType = z.infer<typeof UpdateTrustBadge>
