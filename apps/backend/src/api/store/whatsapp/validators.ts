import { z } from "@medusajs/framework/zod"

export const SendOtp = z.object({ cart_id: z.string().startsWith("cart_") }).strict()
export const VerifyOtp = z.object({ cart_id: z.string().startsWith("cart_"), code: z.string().regex(/^\d{6}$/) }).strict()
export const TestWhatsapp = z.object({ phone: z.string().min(8).max(20) }).strict()

export type SendOtpType = z.infer<typeof SendOtp>
export type VerifyOtpType = z.infer<typeof VerifyOtp>
export type TestWhatsappType = z.infer<typeof TestWhatsapp>
