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

export const ListConversations = z.object({
  q: z.string().max(50).optional(),
  unread: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
})
export const SendInboxMessage = z.object({ text: z.string().trim().min(1).max(4000) }).strict()

export type SendOtpType = z.infer<typeof SendOtp>
export type VerifyOtpType = z.infer<typeof VerifyOtp>
export type TestWhatsappType = z.infer<typeof TestWhatsapp>
export type SendProductsType = z.infer<typeof SendProducts>
export type ListConversationsType = z.infer<typeof ListConversations>
export type SendInboxMessageType = z.infer<typeof SendInboxMessage>
