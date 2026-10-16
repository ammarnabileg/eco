import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  deleteTrustBadgeWorkflow,
  updateTrustBadgeWorkflow,
} from "../../../../../workflows/store-content/trust-badges"
import { UpdateTrustBadgeType } from "../../validators"

export async function POST(
  req: MedusaRequest<UpdateTrustBadgeType>,
  res: MedusaResponse
) {
  const { result } = await updateTrustBadgeWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id },
  })
  res.json({ trust_badge: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteTrustBadgeWorkflow(req.scope).run({
    input: { id: req.params.id },
  })
  res.json({ id: req.params.id, object: "trust_badge", deleted: true })
}
