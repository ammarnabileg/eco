import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  deleteSpecTemplateWorkflow,
  updateSpecTemplateWorkflow,
} from "../../../../../workflows/catalog/spec-templates"
import { UpdateSpecTemplateType } from "../../validators"

export async function POST(req: MedusaRequest<UpdateSpecTemplateType>, res: MedusaResponse) {
  const { result } = await updateSpecTemplateWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id },
  })
  res.json({ spec_template: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteSpecTemplateWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.json({ id: req.params.id, object: "spec_template", deleted: true })
}
