import { z } from "@medusajs/framework/zod"

export const UpdateAfterSalesRequest = z
  .object({
    status: z.enum(["new", "reviewing", "approved", "rejected", "received", "completed"]).optional(),
    admin_note: z.string().max(2000).nullable().optional(),
  })
  .strict()

export type UpdateAfterSalesRequestType = z.infer<typeof UpdateAfterSalesRequest>
