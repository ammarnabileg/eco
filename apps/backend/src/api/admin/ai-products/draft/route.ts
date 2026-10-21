import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { draftProduct } from "../../../../workflows/ai-product/draft"
import { DraftAiProductType } from "../validators"

// Reads the official page and writes a draft for review. Saves nothing.
export async function POST(req: MedusaRequest<DraftAiProductType>, res: MedusaResponse) {
  res.json({ draft: await draftProduct(req.scope, req.validatedBody) })
}
