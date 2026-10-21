import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { publishProductVideo } from "../../../../../../workflows/ai-product/create"
import { PublishAiVideoType } from "../../../validators"

export async function POST(req: MedusaRequest<PublishAiVideoType>, res: MedusaResponse) {
  res.json(await publishProductVideo(req.scope, req.params.id, req.validatedBody.publish))
}
