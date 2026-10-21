import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { publishSlide } from "../../../../workflows/studio"
import { PublishSlideType } from "../validators"

export async function POST(req: MedusaRequest<PublishSlideType>, res: MedusaResponse) {
  res.json({ slide: await publishSlide(req.scope, req.validatedBody) })
}
