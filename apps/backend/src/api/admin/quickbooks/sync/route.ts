import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import QuickBooksModuleService from "../../../../modules/quickbooks/service"
import { syncOrderToQuickbooksWorkflow, syncProductToQuickbooksWorkflow } from "../../../../workflows/quickbooks"
import { SyncQuickbooksType } from "../validators"

// Manual sync: specific orders/products, or every failed order again.
export async function POST(req: MedusaRequest<SyncQuickbooksType>, res: MedusaResponse) {
  const svc: QuickBooksModuleService = req.scope.resolve(QUICKBOOKS_MODULE)
  const orders = [...(req.validatedBody.orders ?? [])]
  if (req.validatedBody.retry_failed) {
    const failed = await svc.listQbSyncRecords({ status: "failed", entity: "order" }, { take: 50 })
    orders.push(...failed.map((r) => r.local_id))
  }
  const results: { id: string; ok: boolean; error?: string }[] = []
  for (const id of [...new Set(orders)]) {
    try {
      await syncOrderToQuickbooksWorkflow(req.scope).run({ input: id })
      results.push({ id, ok: true })
    } catch (error) {
      results.push({ id, ok: false, error: (error as Error).message })
    }
  }
  for (const id of req.validatedBody.products ?? []) {
    try {
      await syncProductToQuickbooksWorkflow(req.scope).run({ input: id })
      results.push({ id, ok: true })
    } catch (error) {
      results.push({ id, ok: false, error: (error as Error).message })
    }
  }
  res.json({ results })
}
