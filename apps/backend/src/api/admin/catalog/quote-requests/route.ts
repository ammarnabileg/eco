import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { CATALOG_MODULE } from "../../../../modules/catalog"
import CatalogModuleService from "../../../../modules/catalog/service"

const STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: CatalogModuleService = req.scope.resolve(CATALOG_MODULE)
  const status = STATUSES.find((s) => s === req.query.status)
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const [quoteRequests, count] = await service.listAndCountQuoteRequests(
    status ? { status } : {},
    { order: { created_at: "DESC" }, take: limit, skip: offset }
  )
  res.json({ quote_requests: quoteRequests, count, limit, offset })
}
