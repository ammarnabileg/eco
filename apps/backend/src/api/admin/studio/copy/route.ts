import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { adCopy } from "../../../../workflows/studio"
import { AdCopyType } from "../validators"

export async function POST(req: MedusaRequest<AdCopyType>, res: MedusaResponse) {
  res.json({ copy: await adCopy(req.scope, req.validatedBody) })
}
