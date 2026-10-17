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
