import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import QuickBooksModuleService from "../../../../modules/quickbooks/service"
import { syncOrderToQuickbooksWorkflow, syncProductToQuickbooksWorkflow } from "../../../../workflows/quickbooks"
import { SyncQuickbooksType } from "../validators"

let resending = false

// Every product, one at a time and spaced out: QuickBooks allows 10 requests
// a second per company, and each product takes a few.
async function resendAllProducts(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  resending = true
  let ok = 0
  let failed = 0
  try {
    const { data } = await query.graph({ entity: "product", fields: ["id"] })
    for (const { id } of data) {
      try {
        await syncProductToQuickbooksWorkflow(container).run({ input: id })
        ok++
      } catch {
        failed++
      }
      await new Promise((r) => setTimeout(r, 400))
    }
    logger.info(`QuickBooks: re-sent ${ok} products, ${failed} failed`)
  } finally {
    resending = false
  }
}

// Manual sync: specific orders/products, every failed order and product
// again, or all products in the background.
export async function POST(req: MedusaRequest<SyncQuickbooksType>, res: MedusaResponse) {
  const svc: QuickBooksModuleService = req.scope.resolve(QUICKBOOKS_MODULE)
  if (req.validatedBody.all_products) {
    if (!resending) {
      void resendAllProducts(req.scope)
    }
    return res.status(202).json({ started: true, already_running: resending })
  }
  const orders = [...(req.validatedBody.orders ?? [])]
  const products = [...(req.validatedBody.products ?? [])]
  if (req.validatedBody.retry_failed) {
    const failed = await svc.listQbSyncRecords({ status: "failed", entity: "order" }, { take: 50 })
    orders.push(...failed.map((r) => r.local_id))
    const failedVariants = await svc.listQbSyncRecords({ status: "failed", entity: "variant" }, { take: 50 })
    if (failedVariants.length) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "variant",
        fields: ["product_id"],
        filters: { id: failedVariants.map((r) => r.local_id) },
      })
      products.push(...data.map((v) => v.product_id as string).filter(Boolean))
    }
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
  for (const id of [...new Set(products)]) {
    try {
      await syncProductToQuickbooksWorkflow(req.scope).run({ input: id })
      results.push({ id, ok: true })
    } catch (error) {
      results.push({ id, ok: false, error: (error as Error).message })
    }
  }
  res.json({ results })
}
