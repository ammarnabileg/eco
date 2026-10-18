import { z } from "@medusajs/framework/zod"

export const SendOtp = z.object({ cart_id: z.string().startsWith("cart_") }).strict()
export const VerifyOtp = z.object({ cart_id: z.string().startsWith("cart_"), code: z.string().regex(/^\d{6}$/) }).strict()
export const TestWhatsapp = z
  .object({ phone: z.string().min(8).max(20), kind: z.enum(["text", "buttons", "carousel"]).default("text") })
  .strict()
export const SendProducts = z
  .object({
    phone: z.string().min(8).max(20),
    product_ids: z.array(z.string().startsWith("prod_")).min(1).max(10),
    note: z.string().max(500).optional(),
  })
  .strict()

export type SendOtpType = z.infer<typeof SendOtp>
export type VerifyOtpType = z.infer<typeof VerifyOtp>
export type TestWhatsappType = z.infer<typeof TestWhatsapp>
export type SendProductsType = z.infer<typeof SendProducts>
