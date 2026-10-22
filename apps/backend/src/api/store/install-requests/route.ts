import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { createInstallRequestWorkflow } from "../../../workflows/catalog/install-requests"
import { CreateInstallRequestType } from "../catalog/validators"

export async function POST(req: AuthenticatedMedusaRequest<CreateInstallRequestType>, res: MedusaResponse) {
  const { website: _honeypot, ...body } = req.validatedBody
  const { result } = await createInstallRequestWorkflow(req.scope).run({
    input: { ...body, customer_id: req.auth_context?.actor_id ?? null },
  })
  // Only confirm receipt; the stored request is for staff.
  res.status(201).json({ install_request: { id: result.id, status: result.status } })
}
