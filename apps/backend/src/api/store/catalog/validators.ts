import { z } from "@medusajs/framework/zod"

export const CreateQuoteRequest = z
  .object({
    product_id: z.string().min(1),
    variant_id: z.string().min(1).nullish(),
    customer_name: z.string().trim().min(2).max(120),
    // Kuwait numbers are 8 digits; allow the country code and spaces.
    phone: z.string().trim().regex(/^\+?[0-9 ]{8,16}$/, "Enter a valid phone number"),
    email: z.string().trim().email().max(200).nullish(),
    company: z.string().trim().max(200).nullish(),
    quantity: z.number().int().min(1).max(10000).optional(),
    message: z.string().trim().max(1000).nullish(),
    locale: z.enum(["ar", "en"]).optional(),
    // Honeypot: real visitors never see or fill this field.
    website: z.string().max(0).optional(),
  })
  .strict()
export type CreateQuoteRequestType = z.infer<typeof CreateQuoteRequest>

export const AddConfiguredItem = z
  .object({
    variant_id: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
    addon_option_ids: z.array(z.string().min(1)).max(20).default([]),
  })
  .strict()
export type AddConfiguredItemType = z.infer<typeof AddConfiguredItem>

// Kuwait's governorates, stored in Arabic as in addresses.
export const GOVERNORATES = ["العاصمة", "حولي", "الفروانية", "مبارك الكبير", "الأحمدي", "الجهراء"] as const

export const CreateInstallRequest = z
  .object({
    customer_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(/^\+?[0-9 ]{8,16}$/, "Enter a valid phone number"),
    governorate: z.enum(GOVERNORATES),
    area: z.string().trim().max(120).nullish(),
    service: z.enum(["cctv", "networking", "smart_home", "intercom", "other"]),
    // A day (YYYY-MM-DD) from today on; staff confirm the actual time.
    preferred_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => d >= new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10), "Pick a date from today on")
      .nullish(),
    message: z.string().trim().max(1000).nullish(),
    product_id: z.string().min(1).nullish(),
    locale: z.string().regex(/^[a-z]{2}$/).optional(),
    // Honeypot: real visitors never see or fill this field.
    website: z.string().max(0).optional(),
  })
  .strict()
export type CreateInstallRequestType = z.infer<typeof CreateInstallRequest>
