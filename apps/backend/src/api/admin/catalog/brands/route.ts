import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { CATALOG_MODULE } from "../../../../modules/catalog"
import CatalogModuleService from "../../../../modules/catalog/service"
import { createBrandWorkflow } from "../../../../workflows/catalog/brands"
import { CreateBrandType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: CatalogModuleService = req.scope.resolve(CATALOG_MODULE)
  const brands = await service.listBrands({}, { order: { rank: "ASC", name: "ASC" } })
  res.json({ brands })
}

export async function POST(req: MedusaRequest<CreateBrandType>, res: MedusaResponse) {
  const { result } = await createBrandWorkflow(req.scope).run({ input: req.validatedBody })
  res.status(201).json({ brand: result })
}
