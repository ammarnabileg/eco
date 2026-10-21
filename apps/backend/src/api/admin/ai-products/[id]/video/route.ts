import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { refreshProductVideo, startProductVideo } from "../../../../../workflows/ai-product/create"
import { StartAiVideoType } from "../../validators"

// Optional product video: start the job, then poll until it is ready.
export async function POST(req: MedusaRequest<StartAiVideoType>, res: MedusaResponse) {
  res.json({ video: await startProductVideo(req.scope, req.params.id, req.validatedBody.image_url) })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ video: await refreshProductVideo(req.scope, req.params.id) })
}
