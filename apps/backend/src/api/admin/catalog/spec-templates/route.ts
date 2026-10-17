import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { createSpecTemplateWorkflow } from "../../../../workflows/catalog/spec-templates"
import { CreateSpecTemplateType } from "../validators"

export const SPEC_TEMPLATE_FIELDS = [
  "id",
  "name_ar",
  "name_en",
  "attributes",
  "rank",
  "product_categories.id",
  "product_categories.name",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "spec_template",
    fields: SPEC_TEMPLATE_FIELDS,
    pagination: { order: { rank: "ASC" } },
  })
  res.json({ spec_templates: data })
}

export async function POST(req: MedusaRequest<CreateSpecTemplateType>, res: MedusaResponse) {
  const { result } = await createSpecTemplateWorkflow(req.scope).run({ input: req.validatedBody })
  res.status(201).json({ spec_template: result })
}
