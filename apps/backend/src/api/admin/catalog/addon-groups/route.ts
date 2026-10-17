import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { CATALOG_MODULE } from "../../../../modules/catalog"
import CatalogModuleService from "../../../../modules/catalog/service"
import { createAddonGroupWorkflow } from "../../../../workflows/catalog/addon-groups"
import { CreateAddonGroupType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: CatalogModuleService = req.scope.resolve(CATALOG_MODULE)
  const groups = await service.listAddonGroups(
    {},
    { relations: ["options"], order: { rank: "ASC" } }
  )
  res.json({ addon_groups: groups })
}

export async function POST(req: MedusaRequest<CreateAddonGroupType>, res: MedusaResponse) {
  const { result } = await createAddonGroupWorkflow(req.scope).run({ input: req.validatedBody })
  res.status(201).json({ addon_group: result })
}
