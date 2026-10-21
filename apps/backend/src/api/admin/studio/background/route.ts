import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { generateBackground } from "../../../../workflows/studio"
import { GenerateBackgroundType } from "../validators"

export async function POST(req: MedusaRequest<GenerateBackgroundType>, res: MedusaResponse) {
  res.json({ url: await generateBackground(req.scope, req.validatedBody) })
}
