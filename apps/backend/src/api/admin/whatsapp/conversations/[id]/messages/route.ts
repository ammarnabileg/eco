import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { WHATSAPP_MODULE } from "../../../../../../modules/whatsapp"
import WhatsAppModuleService from "../../../../../../modules/whatsapp/service"
import { SendInboxMessageType } from "../../../../../store/whatsapp/validators"
import { whatsappSettings } from "../../../../../../workflows/whatsapp"
import { deliver } from "../../../../../../workflows/whatsapp/inbox"

// Staff reply from the inbox.
export async function POST(req: AuthenticatedMedusaRequest<SendInboxMessageType>, res: MedusaResponse) {
  const settings = await whatsappSettings(req.scope)
  if (!settings.active) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Save and enable WhatsApp first")
  const wa = req.scope.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)
  const conversation = await wa.retrieveWaConversation(req.params.id)
  await deliver(
    req.scope,
    conversation.phone,
    { type: "text", text: req.validatedBody.text },
    { kind: "staff", author_id: req.auth_context.actor_id }
  )
  res.json({ sent: true })
}
