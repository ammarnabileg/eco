import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Knex } from "@medusajs/framework/mikro-orm/knex"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { WHATSAPP_MODULE } from "../../../../../modules/whatsapp"
import WhatsAppModuleService from "../../../../../modules/whatsapp/service"

// One conversation: its last 200 messages (oldest first) and the customer's
// recent orders, matched on the last 8 digits of the shipping phone.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const wa = req.scope.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)
  const conversation = await wa.retrieveWaConversation(req.params.id)
  const messages = await wa.listWaMessages(
    { conversation_id: conversation.id },
    { take: 200, order: { created_at: "DESC" } }
  )
  // Phones are stored as typed ("5000 1234", "+965…"), so compare digits only.
  const pg = req.scope.resolve<Knex>(ContainerRegistrationKeys.PG_CONNECTION)
  const rows: { id: string }[] = await pg("order as o")
    .join("order_address as a", "a.id", "o.shipping_address_id")
    .whereNull("o.deleted_at")
    .whereRaw("right(regexp_replace(coalesce(a.phone, ''), '\\D', '', 'g'), 8) = ?", [conversation.phone.slice(-8)])
    .orderBy("o.created_at", "desc")
    .limit(5)
    .select("o.id")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = rows.length
    ? await query.graph({
        entity: "order",
        fields: ["id", "display_id", "total", "currency_code", "status", "created_at"],
        filters: { id: rows.map((r) => r.id) },
      })
    : { data: [] }
  res.json({ conversation, messages: messages.reverse(), orders })
}
