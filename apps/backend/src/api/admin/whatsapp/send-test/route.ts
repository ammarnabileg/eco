import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { TestWhatsappType } from "../../../store/whatsapp/validators"
import { sendText } from "../../../../modules/whatsapp/client"
import { normalizePhone } from "../../../../modules/whatsapp/messages"
import { whatsappSettings } from "../../../../workflows/whatsapp"

export async function POST(req: MedusaRequest<TestWhatsappType>, res: MedusaResponse) {
  const settings = await whatsappSettings(req.scope)
  const phone = normalizePhone(req.validatedBody.phone)
  if (!settings.active || !phone) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, settings.active ? "Invalid phone number" : "Save and enable WhatsApp first")
  }
  await sendText(settings.cfg, phone, "رسالة تجربة من متجر Laly ✅")
  res.json({ sent: true })
}
