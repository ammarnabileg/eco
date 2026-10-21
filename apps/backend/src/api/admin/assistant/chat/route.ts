import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { assistantTurn, ChatMessage } from "../../../../workflows/assistant/agent"
import { AssistantChatType } from "../validators"

export async function POST(req: MedusaRequest<AssistantChatType>, res: MedusaResponse) {
  const { messages, text } = req.validatedBody
  const history = [...(messages as ChatMessage[]), { role: "user", content: text } as ChatMessage]
  res.json(await assistantTurn(req.scope, history))
}
