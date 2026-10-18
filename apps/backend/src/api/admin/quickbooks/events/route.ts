import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import QuickBooksModuleService from "../../../../modules/quickbooks/service"

// Changes reported by QuickBooks. ?all=1 lists everything recent; by default
// only those touching store records that nobody reviewed yet.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: QuickBooksModuleService = req.scope.resolve(QUICKBOOKS_MODULE)
  const all = req.query.all === "1"
  const [events, count] = await svc.listAndCountQbWebhookEvents(all ? {} : { attention: true, reviewed_at: null }, {
    take: 50,
    order: { created_at: "DESC" },
    select: ["id", "entity", "entity_id", "operation", "occurred_at", "local_entity", "local_id", "attention", "reviewed_at", "created_at"],
  })
  res.json({ events, count })
}
