import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { AI_MODULE } from "../../../../modules/ai"
import AiModuleService from "../../../../modules/ai/service"
import { saveAiBannerWorkflow } from "../../../../workflows/studio"
import { SaveBannerType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const banners = await req.scope
    .resolve<AiModuleService>(AI_MODULE)
    .listAiBanners({}, { take: 60, order: { updated_at: "DESC" } })
  res.json({ banners })
}

export async function POST(req: MedusaRequest<SaveBannerType>, res: MedusaResponse) {
  const { result } = await saveAiBannerWorkflow(req.scope).run({ input: { ...req.validatedBody, status: "draft", output_url: null } })
  res.status(201).json({ banner: result })
}
