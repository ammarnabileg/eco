import { timingSafeEqual } from "node:crypto"

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { incomingMessage } from "../../../modules/whatsapp/client"
import { normalizePhone } from "../../../modules/whatsapp/messages"
import { acknowledgeReply, recordWhatsappReplyWorkflow, whatsappWebhookToken } from "../../../workflows/whatsapp"

const sameToken = (got: string, expected: string) =>
  got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected))

// Customers' WhatsApp replies (Evolution webhook, MESSAGES_UPSERT). Only the
// answer to the order summary is acted on: 1 confirms, 2 asks to cancel.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const token = req.headers["x-laly-token"]
  if (!sameToken(String(Array.isArray(token) ? token[0] : (token ?? "")), whatsappWebhookToken())) {
    return res.status(401).json({ message: "invalid token" })
  }
  const message = incomingMessage(req.body)
  const phone = normalizePhone(message?.phone)
  if (!message || !phone) return res.json({ handled: false })
  const { result } = await recordWhatsappReplyWorkflow(req.scope).run({ input: { phone, text: message.text } })
  if (result) {
    acknowledgeReply(req.scope, result).catch((e) =>
      req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn(`WhatsApp acknowledgement failed: ${(e as Error).message}`)
    )
  }
  res.json({ handled: !!result })
}
