import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { STORE_CONTENT_MODULE } from "../../../../modules/store-content"
import StoreContentModuleService from "../../../../modules/store-content/service"
import { createHeroSlideWorkflow } from "../../../../workflows/store-content/hero-slides"
import { CreateHeroSlideType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: StoreContentModuleService = req.scope.resolve(STORE_CONTENT_MODULE)
  const heroSlides = await service.listHeroSlides({}, { order: { rank: "ASC" } })
  res.json({ hero_slides: heroSlides })
}

export async function POST(
  req: MedusaRequest<CreateHeroSlideType>,
  res: MedusaResponse
) {
  const { result } = await createHeroSlideWorkflow(req.scope).run({
    input: req.validatedBody,
  })
  res.status(201).json({ hero_slide: result })
}
