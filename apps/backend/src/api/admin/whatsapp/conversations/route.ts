import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { WHATSAPP_MODULE } from "../../../../modules/whatsapp"
import WhatsAppModuleService from "../../../../modules/whatsapp/service"
import { ListConversations } from "../../../store/whatsapp/validators"

// Inbox: conversations, latest first. `q` matches phone digits or name.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = ListConversations.safeParse(req.query)
  if (!parsed.success) throw new MedusaError(MedusaError.Types.INVALID_DATA, parsed.error.message)
  const { q, unread, limit, offset } = parsed.data
  const wa = req.scope.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)
  const term = q?.trim()
  const digits = term?.replace(/\D/g, "")
  const filters: Record<string, unknown> = {
    ...(unread === "true" ? { unread: { $gt: 0 } } : {}),
    ...(term
      ? { $or: [...(digits ? [{ phone: { $like: `%${digits}%` } }] : []), { name: { $ilike: `%${term}%` } }] }
      : {}),
  }
  const [conversations, count] = await wa.listAndCountWaConversations(filters, {
    take: limit,
    skip: offset,
    order: { last_message_at: "DESC" },
  })
  const [, unreadCount] = await wa.listAndCountWaConversations({ unread: { $gt: 0 } }, { take: 1 })
  res.json({ conversations, count, unread: unreadCount })
}
