import { z } from "@medusajs/framework/zod"

const FieldValue = z.union([z.string().max(4000), z.array(z.string().max(100)).max(20), z.null()])

export const SaveIntegration = z
  .object({
    enabled: z.boolean().optional(),
    values: z.record(z.string(), FieldValue).optional(),
  })
  .strict()

export type SaveIntegrationType = z.infer<typeof SaveIntegration>
