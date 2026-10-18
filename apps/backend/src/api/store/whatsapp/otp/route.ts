import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { otpStatus, sendGuestOtp } from "../../../../workflows/whatsapp"
import { SendOtpType } from "../validators"

// Guest checkout: is a WhatsApp code needed, and is it done?
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json(await otpStatus(req.scope, String(req.query.cart_id ?? "")))
}

// Sends a code to the cart's shipping phone.
export async function POST(req: MedusaRequest<SendOtpType>, res: MedusaResponse) {
  res.json(await sendGuestOtp(req.scope, req.validatedBody.cart_id))
}
