import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { deleteBrandWorkflow, updateBrandWorkflow } from "../../../../../workflows/catalog/brands"
import { UpdateBrandType } from "../../validators"

export async function POST(req: MedusaRequest<UpdateBrandType>, res: MedusaResponse) {
  const { result } = await updateBrandWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id },
  })
  res.json({ brand: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteBrandWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.json({ id: req.params.id, object: "brand", deleted: true })
}
