import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  deleteAddonGroupWorkflow,
  updateAddonGroupWorkflow,
} from "../../../../../workflows/catalog/addon-groups"
import { UpdateAddonGroupType } from "../../validators"

export async function POST(req: MedusaRequest<UpdateAddonGroupType>, res: MedusaResponse) {
  const { result } = await updateAddonGroupWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id },
  })
  res.json({ addon_group: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteAddonGroupWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.json({ id: req.params.id, object: "addon_group", deleted: true })
}
