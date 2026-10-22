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
  banner_url: z.string().url().nullish(),
  banner_mobile_url: z.string().url().nullish(),
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

// Information pages: plain text with "## " headings, never HTML.
const pageText = (max: number) => z.string().max(max).refine((s) => !/<\s*\/?\s*[a-z!]/i.test(s), "HTML is not allowed")
const faqItem = z
  .object({
    group_ar: z.string().trim().max(80).nullish(),
    group_en: z.string().trim().max(80).nullish(),
    q_ar: z.string().trim().min(1).max(300),
    a_ar: pageText(3000).pipe(z.string().trim().min(1)),
    q_en: z.string().trim().max(300).nullish(),
    a_en: pageText(3000).nullish(),
  })
  .strict()
export const SavePage = z
  .object({
    title_ar: z.string().trim().min(1).max(150),
    title_en: z.string().trim().max(150).nullish(),
    summary_ar: z.string().trim().max(400).nullish(),
    summary_en: z.string().trim().max(400).nullish(),
    body_ar: pageText(60000).nullish(),
    body_en: pageText(60000).nullish(),
    faq: z.array(faqItem).max(150).nullish(),
  })
  .strict()
export type SavePageType = z.infer<typeof SavePage>
