import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { AFTER_SALES_MODULE } from "../../../../../modules/after-sales"
import AfterSalesModuleService from "../../../../../modules/after-sales/service"
import { CATALOG_MODULE } from "../../../../../modules/catalog"
import CatalogModuleService from "../../../../../modules/catalog/service"

// The signed-in customer's own installation, quote and after-sales requests,
// with their status. Staff notes are internal and never returned.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const catalog = req.scope.resolve<CatalogModuleService>(CATALOG_MODULE)
  const afterSales = req.scope.resolve<AfterSalesModuleService>(AFTER_SALES_MODULE)
  const opts = { order: { created_at: "DESC" as const }, take: 50 }
  const [installs, quotes, requests] = await Promise.all([
    catalog.listInstallRequests({ customer_id: customerId }, { ...opts, select: ["id", "service", "status", "preferred_date", "created_at"] }),
    catalog.listQuoteRequests(
      { customer_id: customerId },
      { ...opts, select: ["id", "product_id", "product_title", "quantity", "status", "created_at"] }
    ),
    afterSales.listAfterSalesRequests(
      { customer_id: customerId },
      { ...opts, select: ["id", "kind", "order_id", "order_display_id", "items", "reason", "status", "created_at"] }
    ),
  ])
  res.json({ install_requests: installs, quote_requests: quotes, after_sales_requests: requests })
}
