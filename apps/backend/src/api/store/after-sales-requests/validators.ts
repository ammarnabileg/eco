import { z } from "@medusajs/framework/zod"

export const CreateAfterSalesRequest = z
  .object({
    order_id: z.string().startsWith("order_"),
    kind: z.enum(["return", "exchange", "warranty"]),
    reason: z.enum(["defective", "wrong_item", "not_as_described", "changed_mind", "other"]),
    details: z.string().trim().max(2000).optional(),
    phone: z.string().trim().regex(/^\+?[0-9 ]{8,16}$/, "Enter a valid phone number").optional(),
    items: z
      .array(z.object({ line_item_id: z.string().min(1).max(100), quantity: z.number().int().min(1).max(1000) }).strict())
      .min(1)
      .max(50),
    locale: z.string().max(10).optional(),
    /** Honeypot: must stay empty. */
    website: z.string().max(0).optional(),
  })
  .strict()

export type CreateAfterSalesRequestType = z.infer<typeof CreateAfterSalesRequest>
