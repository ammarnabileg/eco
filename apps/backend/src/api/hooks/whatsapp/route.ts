import { timingSafeEqual } from "node:crypto"

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { WHATSAPP_MODULE } from "../../../modules/whatsapp"
import { incomingMessage } from "../../../modules/whatsapp/client"
import { normalizePhone } from "../../../modules/whatsapp/messages"
import WhatsAppModuleService from "../../../modules/whatsapp/service"
import { acknowledgeReply, recordWhatsappReplyWorkflow, whatsappWebhookToken } from "../../../workflows/whatsapp"
import { recordWaMessageWorkflow } from "../../../workflows/whatsapp/inbox"

const sameToken = (got: string, expected: string) =>
  got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected))

// Customers' WhatsApp messages (Evolution webhook, MESSAGES_UPSERT). All of them
// go to the admin inbox; an answer to the order summary is also acted on:
// 1 confirms, 2 asks to cancel.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const token = req.headers["x-laly-token"]
  if (!sameToken(String(Array.isArray(token) ? token[0] : (token ?? "")), whatsappWebhookToken())) {
    return res.status(401).json({ message: "invalid token" })
  }
  const message = incomingMessage(req.body)
  const phone = normalizePhone(message?.phone)
  if (!message || !phone) return res.json({ handled: false })
  // Evolution may deliver the same message twice.
  const wa = req.scope.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)
  if (message.id && (await wa.listWaMessages({ external_id: message.id, direction: "in" }, { take: 1 })).length) {
    return res.json({ handled: false, duplicate: true })
  }
  await recordWaMessageWorkflow(req.scope).run({
    input: {
      phone,
      instance: message.instance,
      direction: "in",
      kind: "customer",
      body: message.text,
      status: "received",
      external_id: message.id,
      name: message.name,
    },
  })
  const { result } = await recordWhatsappReplyWorkflow(req.scope).run({ input: { phone, text: message.text } })
  if (result) {
    acknowledgeReply(req.scope, result).catch((e) =>
      req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn(`WhatsApp acknowledgement failed: ${(e as Error).message}`)
    )
  }
  res.json({ handled: !!result })
}
