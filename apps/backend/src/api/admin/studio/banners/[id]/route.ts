import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { AI_MODULE } from "../../../../../modules/ai"
import AiModuleService from "../../../../../modules/ai/service"
import { deleteAiBannerWorkflow, PriceSnapshot, productPrice, saveAiBannerWorkflow } from "../../../../../workflows/studio"
import { SaveBannerType } from "../../validators"

// A saved design, with the product's price today so the editor can warn when
// the image shows an old one.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const banner = await req.scope.resolve<AiModuleService>(AI_MODULE).retrieveAiBanner(req.params.id)
  const shown = banner.price_snapshot as PriceSnapshot | null
  const current = banner.product_id ? await productPrice(req.scope, banner.product_id, shown?.currency_code ?? "kwd") : null
  res.json({ banner, current_price: current })
}

// Any edit makes it a draft again: it has to be approved (and exported) anew.
export async function POST(req: MedusaRequest<SaveBannerType>, res: MedusaResponse) {
  const { result } = await saveAiBannerWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id, status: "draft", output_url: null },
  })
  res.json({ banner: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteAiBannerWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.json({ id: req.params.id, deleted: true })
}
