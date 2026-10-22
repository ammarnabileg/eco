import { z } from "@medusajs/framework/zod"

const displayId = z.coerce.number().int().positive().max(2_147_483_647)
const phone = z.string().trim().min(8).max(20)

export const RequestTracking = z
  .object({
    display_id: displayId,
    // Optional only for a signed-in customer opening their own order.
    phone: phone.optional(),
    /** Honeypot: must stay empty. */
    website: z.string().max(0).optional(),
  })
  .strict()

export const VerifyTracking = z
  .object({ display_id: displayId, phone, code: z.string().trim().regex(/^\d{6}$/) })
  .strict()

export type RequestTrackingType = z.infer<typeof RequestTracking>
export type VerifyTrackingType = z.infer<typeof VerifyTracking>
