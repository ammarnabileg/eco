import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { QUICKBOOKS_MODULE } from "../../../modules/quickbooks"
import QuickBooksModuleService from "../../../modules/quickbooks/service"
import { parseQboEvents, verifyIntuitSignature } from "../../../modules/quickbooks/webhook"
import { recordQuickbooksEventsWorkflow } from "../../../workflows/quickbooks"

// QuickBooks change notifications (Intuit app > Webhooks). Verified with the
// app's verifier token, recorded once per event, and flagged when they touch
// something the store booked. Nothing in the store is changed from here.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: QuickBooksModuleService = req.scope.resolve(QUICKBOOKS_MODULE)
  const { webhookVerifier } = await svc.getOptions()
  const raw = (req as unknown as { rawBody?: Buffer }).rawBody
  const signature = req.headers["intuit-signature"]
  if (!webhookVerifier || !raw || !verifyIntuitSignature(raw, Array.isArray(signature) ? signature[0] : signature, webhookVerifier)) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn("QuickBooks webhook rejected: missing verifier or bad signature")
    return res.status(401).json({ message: "invalid signature" })
  }
  const { result } = await recordQuickbooksEventsWorkflow(req.scope).run({ input: parseQboEvents(req.body) })
  // Intuit retries anything but a quick 200.
  res.json({ received: result })
}
