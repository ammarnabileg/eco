import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { MedusaError } from "@medusajs/framework/utils"

import { recommendProducts } from "../../../workflows/recommendations"

const Query = z.object({
  viewed: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => (v ?? "").split(",").filter((id) => /^prod_[A-Za-z0-9]+$/.test(id))),
  limit: z.coerce.number().int().min(1).max(24).default(8),
})

// Personal picks: signed-in customers get them from their orders too.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = Query.safeParse(req.query)
  if (!parsed.success) throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error.message)
  const customerId = req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : null
  res.setHeader("Cache-Control", "private, no-store")
  res.json(await recommendProducts(req.scope, { customerId, viewedIds: parsed.data.viewed, limit: parsed.data.limit }))
}
