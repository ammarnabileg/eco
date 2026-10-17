import { z } from "@medusajs/framework/zod"

export const UpdateQuickbooksSettings = z
  .object({
    income_account_id: z.string().min(1).max(40).nullish(),
    deposit_account_id: z.string().min(1).max(40).nullish(),
    currency: z.string().regex(/^[A-Z]{3}$/).nullish(),
  })
  .strict()
export type UpdateQuickbooksSettingsType = z.infer<typeof UpdateQuickbooksSettings>

export const SyncQuickbooks = z
  .object({
    orders: z.array(z.string().startsWith("order_")).max(50).optional(),
    products: z.array(z.string().startsWith("prod_")).max(50).optional(),
    retry_failed: z.boolean().optional(),
  })
  .strict()
export type SyncQuickbooksType = z.infer<typeof SyncQuickbooks>
