import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { createQuoteRequestWorkflow } from "../../../workflows/catalog/quote-requests"
import { CreateQuoteRequestType } from "../catalog/validators"

export async function POST(
  req: AuthenticatedMedusaRequest<CreateQuoteRequestType>,
  res: MedusaResponse
) {
  const { website: _honeypot, ...body } = req.validatedBody
  const { result } = await createQuoteRequestWorkflow(req.scope).run({
    input: { ...body, customer_id: req.auth_context?.actor_id ?? null },
  })
  // Only confirm receipt; the stored request is for staff.
  res.status(201).json({ quote_request: { id: result.id, status: result.status } })
}
