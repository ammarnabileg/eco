import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { Action, executeAction } from "../../../../workflows/assistant/tools"
import { AssistantExecuteType } from "../validators"

// Applies a change the assistant proposed, after the admin pressed the button.
export async function POST(req: AuthenticatedMedusaRequest<AssistantExecuteType>, res: MedusaResponse) {
  const action = req.validatedBody.action as Action
  const result = await executeAction(req.scope, action)
  req.scope
    .resolve(ContainerRegistrationKeys.LOGGER)
    .info(`Assistant action ${action.tool} applied by ${req.auth_context.actor_id}: ${action.summary.split("\n")[0]}`)
  res.json({ result })
}
