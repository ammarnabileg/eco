import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { publishPageWorkflow } from "../../../../../../workflows/store-content/pages"
import { knownSlug } from "../../../../../../modules/store-content/pages"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const slug = knownSlug(req.params.slug)
  const { result } = await publishPageWorkflow(req.scope).run({
    input: { slug, user_id: req.auth_context?.actor_id ?? null },
  })
  res.json({ page: result })
}
