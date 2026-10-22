import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { unpublishPageWorkflow } from "../../../../../../workflows/store-content/pages"
import { knownSlug } from "../../../../../../modules/store-content/pages"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const slug = knownSlug(req.params.slug)
  const { result } = await unpublishPageWorkflow(req.scope).run({ input: { slug } })
  res.json({ page: result })
}
