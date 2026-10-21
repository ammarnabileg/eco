import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { createAiProduct } from "../../../../workflows/ai-product/create"
import { CreateAiProductType } from "../validators"

export async function POST(req: MedusaRequest<CreateAiProductType>, res: MedusaResponse) {
  res.json({ product: await createAiProduct(req.scope, req.validatedBody) })
}
