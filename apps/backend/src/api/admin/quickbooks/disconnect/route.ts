import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { disconnectQuickbooksWorkflow } from "../../../../workflows/quickbooks"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  await disconnectQuickbooksWorkflow(req.scope).run()
  res.json({ disconnected: true })
}
