import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { updateAfterSalesRequestWorkflow } from "../../../../workflows/after-sales/requests"
import { UpdateAfterSalesRequestType } from "../validators"

// Status and internal note only. Approving a request does not refund or
// create a return in Medusa: staff do that from the order page if they decide to.
export async function POST(req: MedusaRequest<UpdateAfterSalesRequestType>, res: MedusaResponse) {
  const { result } = await updateAfterSalesRequestWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id },
  })
  res.json({ after_sales_request: result })
}
