import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { createAfterSalesRequestWorkflow } from "../../../workflows/after-sales/requests"
import { readTrackToken, trackSecret, TRACK_TOKEN_HEADER } from "../../../workflows/after-sales/token"
import { CreateAfterSalesRequestType } from "./validators"

// A return, exchange or warranty request. Allowed for the signed-in owner of
// the order, or with a tracking token for that order (guests verify their
// phone by WhatsApp first). It only records the request for staff: no Medusa
// return and no refund is created here.
export async function POST(req: AuthenticatedMedusaRequest<CreateAfterSalesRequestType>, res: MedusaResponse) {
  const { website: _honeypot, ...body } = req.validatedBody
  const actorId = req.auth_context?.actor_id ?? null
  const tokenOrder = readTrackToken(String(req.headers[TRACK_TOKEN_HEADER] ?? ""), trackSecret(req.scope))

  let allowed = tokenOrder === body.order_id
  if (!allowed && actorId) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "order", fields: ["id", "customer_id"], filters: { id: body.order_id } })
    allowed = !!data[0] && data[0].customer_id === actorId
  }
  // Same answer for a missing order and someone else's.
  if (!allowed) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")

  const { result } = await createAfterSalesRequestWorkflow(req.scope).run({
    input: { ...body, customer_id: actorId },
  })
  res.status(201).json({
    after_sales_request: { id: result.id, status: result.status, kind: result.kind, order_display_id: result.order_display_id },
  })
}
