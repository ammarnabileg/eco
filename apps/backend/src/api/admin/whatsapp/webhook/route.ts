import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { setWebhook } from "../../../../modules/whatsapp/client"
import { whatsappSettings, whatsappWebhookToken } from "../../../../workflows/whatsapp"

// Points the Evolution instance's webhook at the store (customers' replies).
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const settings = await whatsappSettings(req.scope)
  if (!settings.active) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Save and enable WhatsApp first")
  }
  const url = `${(process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "")}/hooks/whatsapp`
  await setWebhook(settings.cfg, url, whatsappWebhookToken())
  res.json({ url })
}
