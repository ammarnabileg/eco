import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { STORE_CONTENT_MODULE } from "../../../../modules/store-content"
import StoreContentModuleService from "../../../../modules/store-content/service"
import { updateSiteSettingsWorkflow } from "../../../../workflows/store-content/update-site-settings"
import { UpdateSiteSettingsType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: StoreContentModuleService = req.scope.resolve(STORE_CONTENT_MODULE)
  res.json({ settings: await service.getSettings() })
}

export async function POST(
  req: MedusaRequest<UpdateSiteSettingsType>,
  res: MedusaResponse
) {
  const { result } = await updateSiteSettingsWorkflow(req.scope).run({
    input: req.validatedBody,
  })
  res.json({ settings: result })
}
