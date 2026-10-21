import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { assistantTurn } from "../../../../workflows/assistant/agent"
import { AssistantChatType } from "../validators"

export async function POST(req: MedusaRequest<AssistantChatType>, res: MedusaResponse) {
  const { messages, text, provider } = req.validatedBody
  res.json(await assistantTurn(req.scope, { history: messages, text, provider }))
}
