import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { reviewQuickbooksEventWorkflow } from "../../../../../../workflows/quickbooks"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await reviewQuickbooksEventWorkflow(req.scope).run({ input: req.params.id })
  res.json({ event: result })
}
