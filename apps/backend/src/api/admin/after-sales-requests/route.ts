import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { AFTER_SALES_MODULE } from "../../../modules/after-sales"
import AfterSalesModuleService from "../../../modules/after-sales/service"

const STATUSES = ["new", "reviewing", "approved", "rejected", "received", "completed"] as const
const KINDS = ["return", "exchange", "warranty"] as const

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<AfterSalesModuleService>(AFTER_SALES_MODULE)
  const status = STATUSES.find((s) => s === req.query.status)
  const kind = KINDS.find((k) => k === req.query.kind)
  const displayId = Number(String(req.query.q ?? "").replace(/\D/g, "")) || null
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const [rows, count] = await service.listAndCountAfterSalesRequests(
    { ...(status ? { status } : {}), ...(kind ? { kind } : {}), ...(displayId ? { order_display_id: displayId } : {}) },
    { order: { created_at: "DESC" }, take: limit, skip: offset }
  )
  res.json({ after_sales_requests: rows, count, limit, offset })
}
