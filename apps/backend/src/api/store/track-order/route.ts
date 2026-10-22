import { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { readTrackToken, trackSecret, TRACK_TOKEN_HEADER } from "../../../workflows/after-sales/token"
import { requestTracking, trackedOrder } from "../../../workflows/after-sales/tracking"
import { hit } from "../../utils/rate-limit"
import { RequestTrackingType } from "./validators"

const tooMany = (res: MedusaResponse) =>
  res.status(429).json({ type: "too_many_requests", message: "Too many requests, please try again later." })

// Starts tracking: { status: "verified", token } for the signed-in owner,
// otherwise always { status: "code_sent" } (or "unavailable" when WhatsApp is
// off), so the answer never says whether the order and phone match.
export async function POST(req: AuthenticatedMedusaRequest<RequestTrackingType>, res: MedusaResponse) {
  const { display_id, phone } = req.validatedBody
  // Per order number, whether or not it exists, so the limit itself reveals nothing.
  if (!hit(`track-order:${display_id}`, 5, 60 * 60 * 1000)) return tooMany(res)
  res.json(await requestTracking(req.scope, { display_id, phone, customer_id: req.auth_context?.actor_id ?? null }))
}

// The order a valid tracking token grants (sent in the x-laly-track-token header).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = readTrackToken(String(req.headers[TRACK_TOKEN_HEADER] ?? ""), trackSecret(req.scope))
  if (!orderId) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Verify the order again")
  const { customer_id: _customer, ...order } = await trackedOrder(req.scope, orderId)
  res.json({ order })
}
