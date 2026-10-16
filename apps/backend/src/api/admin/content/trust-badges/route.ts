import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { STORE_CONTENT_MODULE } from "../../../../modules/store-content"
import StoreContentModuleService from "../../../../modules/store-content/service"
import { createTrustBadgeWorkflow } from "../../../../workflows/store-content/trust-badges"
import { CreateTrustBadgeType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: StoreContentModuleService = req.scope.resolve(STORE_CONTENT_MODULE)
  const trustBadges = await service.listTrustBadges({}, { order: { rank: "ASC" } })
  res.json({ trust_badges: trustBadges })
}

export async function POST(
  req: MedusaRequest<CreateTrustBadgeType>,
  res: MedusaResponse
) {
  const { result } = await createTrustBadgeWorkflow(req.scope).run({
    input: req.validatedBody,
  })
  res.status(201).json({ trust_badge: result })
}
