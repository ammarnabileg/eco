import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import { verifyState } from "../../../modules/quickbooks/client"
import QuickBooksModuleService from "../../../modules/quickbooks/service"
import { connectQuickbooksWorkflow } from "../../../workflows/quickbooks"

// Intuit sends the browser here after consent. Public route: it is guarded by
// the signed, expiring `state` that only the admin connect route issues.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: QuickBooksModuleService = req.scope.resolve(QUICKBOOKS_MODULE)
  const options = await svc.getOptions()
  const admin = `${new URL(options.redirectUri ?? "http://localhost:9000").origin}/app/quickbooks`
  const { code, state, realmId, error } = req.query as Record<string, string | undefined>

  if (error || !code || !realmId || !state || !options.encryptionKey || !verifyState(state, options.encryptionKey)) {
    return res.redirect(`${admin}?error=${encodeURIComponent(error ?? "invalid_request")}`)
  }
  try {
    await connectQuickbooksWorkflow(req.scope).run({ input: { code, realm_id: realmId } })
    res.redirect(`${admin}?connected=1`)
  } catch (e) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(`QuickBooks connect failed: ${(e as Error).message}`)
    res.redirect(`${admin}?error=connect_failed`)
  }
}
