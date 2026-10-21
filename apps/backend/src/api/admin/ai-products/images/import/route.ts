import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { importImages } from "../../../../../workflows/ai-product/create"
import { ImportAiImagesType } from "../../validators"

export async function POST(req: MedusaRequest<ImportAiImagesType>, res: MedusaResponse) {
  res.json({ images: await importImages(req.scope, req.validatedBody.urls, req.validatedBody.handle) })
}
