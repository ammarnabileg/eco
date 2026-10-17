import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { INTEGRATIONS_MODULE } from "../../../modules/integrations"
import IntegrationsModuleService from "../../../modules/integrations/service"

// Settings > Integrations: every service with its fields. Secrets are never
// returned, only whether one is saved.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: IntegrationsModuleService = req.scope.resolve(INTEGRATIONS_MODULE)
  const backend = (process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "")
  res.json({
    integrations: await service.listForAdmin(),
    // Addresses to paste into each provider's dashboard.
    urls: {
      klickpay_webhook: `${backend}/hooks/payment/klickpay_knet`,
      taly_webhook: `${backend}/hooks/payment/taly_taly`,
      deema_webhook: `${backend}/hooks/payment/deema_deema`,
      quickbooks_redirect: process.env.QUICKBOOKS_REDIRECT_URI ?? `${backend}/quickbooks/callback`,
      google_feed_ar: `${backend}/feeds/google/ar`,
      google_feed_en: `${backend}/feeds/google/en`,
    },
  })
}
