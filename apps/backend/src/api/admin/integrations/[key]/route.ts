import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { INTEGRATIONS_MODULE } from "../../../../modules/integrations"
import IntegrationsModuleService from "../../../../modules/integrations/service"
import { saveIntegrationWorkflow } from "../../../../workflows/integrations"
import { SaveIntegrationType } from "../validators"

export async function POST(req: MedusaRequest<SaveIntegrationType>, res: MedusaResponse) {
  await saveIntegrationWorkflow(req.scope).run({
    input: { key: req.params.key, ...req.validatedBody },
  })
  const service: IntegrationsModuleService = req.scope.resolve(INTEGRATIONS_MODULE)
  const integration = (await service.listForAdmin()).find((i) => i.key === req.params.key)
  res.json({ integration })
}
