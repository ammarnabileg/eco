import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { updateQuoteRequestWorkflow } from "../../../../../workflows/catalog/quote-requests"
import { UpdateQuoteRequestType } from "../../validators"

export async function POST(req: MedusaRequest<UpdateQuoteRequestType>, res: MedusaResponse) {
  const { result } = await updateQuoteRequestWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id },
  })
  res.json({ quote_request: result })
}
