import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { updateQuickbooksSettingsWorkflow } from "../../../../workflows/quickbooks"
import { UpdateQuickbooksSettingsType } from "../validators"

export async function POST(req: MedusaRequest<UpdateQuickbooksSettingsType>, res: MedusaResponse) {
  const { result } = await updateQuickbooksSettingsWorkflow(req.scope).run({ input: req.validatedBody })
  res.json({ settings: result })
}
