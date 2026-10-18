import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { markWaConversationReadWorkflow } from "../../../../../../workflows/whatsapp/inbox"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  await markWaConversationReadWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.json({ read: true })
}
