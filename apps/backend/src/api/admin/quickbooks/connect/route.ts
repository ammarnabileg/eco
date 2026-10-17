import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import { authorizeUrl, signState } from "../../../../modules/quickbooks/client"
import QuickBooksModuleService from "../../../../modules/quickbooks/service"

// Returns Intuit's consent URL; the admin opens it in the browser.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: QuickBooksModuleService = req.scope.resolve(QUICKBOOKS_MODULE)
  const options = await svc.getOptions()
  if (!options.clientId || !options.clientSecret || !options.encryptionKey || !options.redirectUri) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET and QUICKBOOKS_ENCRYPTION_KEY on the server first"
    )
  }
  res.json({ url: authorizeUrl(options.clientId, options.redirectUri, signState(options.encryptionKey)) })
}
