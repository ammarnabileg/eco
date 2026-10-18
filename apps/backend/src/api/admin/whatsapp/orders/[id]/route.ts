import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { WHATSAPP_MODULE } from "../../../../../modules/whatsapp"
import WhatsAppModuleService from "../../../../../modules/whatsapp/service"

// The order's WhatsApp summary and the customer's answer, for the order page.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: WhatsAppModuleService = req.scope.resolve(WHATSAPP_MODULE)
  const [confirmation] = await svc.listWaOrderConfirmations({ order_id: req.params.id }, { take: 1 })
  res.json({ confirmation: confirmation ?? null })
}
