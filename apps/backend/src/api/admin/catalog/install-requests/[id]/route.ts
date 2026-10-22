import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { updateInstallRequestWorkflow } from "../../../../../workflows/catalog/install-requests"
import { UpdateInstallRequestType } from "../../validators"

export async function POST(req: MedusaRequest<UpdateInstallRequestType>, res: MedusaResponse) {
  const { result } = await updateInstallRequestWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id },
  })
  res.json({ install_request: result })
}
