import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  deleteHeroSlideWorkflow,
  updateHeroSlideWorkflow,
} from "../../../../../workflows/store-content/hero-slides"
import { UpdateHeroSlideType } from "../../validators"

export async function POST(
  req: MedusaRequest<UpdateHeroSlideType>,
  res: MedusaResponse
) {
  const { result } = await updateHeroSlideWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id },
  })
  res.json({ hero_slide: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteHeroSlideWorkflow(req.scope).run({
    input: { id: req.params.id },
  })
  res.json({ id: req.params.id, object: "hero_slide", deleted: true })
}
