import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { approveBanner } from "../../../../../../workflows/studio"
import { ApproveBannerType } from "../../../validators"

export async function POST(req: MedusaRequest<ApproveBannerType>, res: MedusaResponse) {
  res.json({ banner: await approveBanner(req.scope, req.params.id, req.validatedBody.output_url) })
}
