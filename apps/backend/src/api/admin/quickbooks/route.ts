import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import QuickBooksModuleService from "../../../modules/quickbooks/service"

// Connection state and sync health for the admin page. Never returns tokens.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: QuickBooksModuleService = req.scope.resolve(QUICKBOOKS_MODULE)
  const options = await svc.getOptions()
  const connection = await svc.getConnection()
  const [failed, failedCount] = await svc.listAndCountQbSyncRecords(
    { status: "failed" },
    { take: 25, order: { updated_at: "DESC" } }
  )
  const [, syncedCount] = await svc.listAndCountQbSyncRecords({ status: "synced" }, { take: 1 })
  res.json({
    configured: Boolean(options.clientId && options.clientSecret && options.encryptionKey),
    environment: options.environment ?? "sandbox",
    connection: connection
      ? {
          realm_id: connection.realm_id,
          company_name: connection.company_name,
          environment: connection.environment,
          currency: connection.currency,
          income_account_id: connection.income_account_id,
          deposit_account_id: connection.deposit_account_id,
          refresh_expires_at: connection.refresh_expires_at,
          connected_at: connection.created_at,
        }
      : null,
    synced_count: syncedCount,
    failed_count: failedCount,
    failed: failed.map((r) => ({ id: r.id, entity: r.entity, local_id: r.local_id, error: r.error, attempts: r.attempts, updated_at: r.updated_at })),
  })
}
