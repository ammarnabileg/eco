import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { productsEligibility } from "../../../lib/bnpl-eligibility"

// The resulting eligibility of products, shown next to their settings.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ids = String(req.query.product_ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100)
  res.json({ products: await productsEligibility(req.scope, ids) })
}
