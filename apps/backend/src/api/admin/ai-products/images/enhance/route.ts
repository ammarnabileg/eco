import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { enhanceImage } from "../../../../../workflows/ai-product/create"
import { EnhanceAiImageType } from "../../validators"

export async function POST(req: MedusaRequest<EnhanceAiImageType>, res: MedusaResponse) {
  res.json({ url: await enhanceImage(req.scope, req.validatedBody) })
}
