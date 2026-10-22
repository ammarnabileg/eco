import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { CATALOG_MODULE } from "../../../../modules/catalog"
import CatalogModuleService from "../../../../modules/catalog/service"

const STATUSES = ["new", "contacted", "scheduled", "done", "cancelled"] as const

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: CatalogModuleService = req.scope.resolve(CATALOG_MODULE)
  const status = STATUSES.find((s) => s === req.query.status)
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const [installRequests, count] = await service.listAndCountInstallRequests(status ? { status } : {}, {
    order: { created_at: "DESC" },
    take: limit,
    skip: offset,
  })
  res.json({ install_requests: installRequests, count, limit, offset })
}
