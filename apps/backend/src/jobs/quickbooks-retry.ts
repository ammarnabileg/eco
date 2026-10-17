import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import QuickBooksModuleService from "../modules/quickbooks/service"
import {
  syncOrderToQuickbooksWorkflow,
  syncProductToQuickbooksWorkflow,
  syncRefundsToQuickbooksWorkflow,
} from "../workflows/quickbooks"

// Retries failed QuickBooks syncs (outage, expired token, missing account
// setting) a few times; after that they wait for a manual retry from the
// admin, where the error is shown.
const MAX_ATTEMPTS = 6

export default async function quickbooksRetry(container: MedusaContainer) {
  const svc = container.resolve<QuickBooksModuleService>(QUICKBOOKS_MODULE)
  if (!(await svc.getConnection())) {
    return
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const failed = (await svc.listQbSyncRecords({ status: "failed" }, { take: 50, order: { updated_at: "ASC" } })).filter(
    (r) => r.attempts < MAX_ATTEMPTS
  )
  for (const record of failed) {
    try {
      if (record.entity === "order") {
        await syncOrderToQuickbooksWorkflow(container).run({ input: record.local_id })
      } else if (record.entity === "variant") {
        const { data } = await query.graph({ entity: "variant", fields: ["product_id"], filters: { id: record.local_id } })
        if (data[0]?.product_id) {
          await syncProductToQuickbooksWorkflow(container).run({ input: data[0].product_id })
        }
      } else if (record.entity === "refund") {
        const { data } = await query.graph({ entity: "refund", fields: ["payment_id"], filters: { id: record.local_id } })
        if (data[0]?.payment_id) {
          await syncRefundsToQuickbooksWorkflow(container).run({ input: data[0].payment_id })
        }
      }
    } catch {
      // Recorded on the sync record by the sync itself.
    }
  }
}

export const config = {
  name: "quickbooks-retry",
  schedule: "*/15 * * * *",
}
