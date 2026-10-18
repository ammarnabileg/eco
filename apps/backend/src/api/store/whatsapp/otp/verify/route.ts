import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { verifyGuestOtpWorkflow } from "../../../../../workflows/whatsapp"
import { VerifyOtpType } from "../../validators"

export async function POST(req: MedusaRequest<VerifyOtpType>, res: MedusaResponse) {
  await verifyGuestOtpWorkflow(req.scope).run({ input: req.validatedBody })
  res.json({ verified: true })
}
