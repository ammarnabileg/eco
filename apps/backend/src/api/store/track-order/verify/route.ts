import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { verifyTracking } from "../../../../workflows/after-sales/tracking"
import { hit } from "../../../utils/rate-limit"
import { VerifyTrackingType } from "../validators"

// Checks the WhatsApp code and returns a 30-minute token for that one order.
// Every failure gets the same answer (wrong code, expired, unknown order).
export async function POST(req: MedusaRequest<VerifyTrackingType>, res: MedusaResponse) {
  const body = req.validatedBody
  if (!hit(`track-verify:${body.display_id}`, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ type: "too_many_requests", message: "Too many requests, please try again later." })
  }
  res.json({ verified: true, ...(await verifyTracking(req.scope, body)) })
}
