import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { INTEGRATIONS_MODULE } from "../../../modules/integrations"
import IntegrationsModuleService from "../../../modules/integrations/service"

// Public IDs the storefront embeds (Clarity, AdSense, site verification,
// Deema widget key) for the integrations that are switched on. No secrets.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: IntegrationsModuleService = req.scope.resolve(INTEGRATIONS_MODULE)
  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({ integrations: await service.publicValues() })
}
