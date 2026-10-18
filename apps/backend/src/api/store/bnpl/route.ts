import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { cartEligibility, productsEligibility } from "../../../lib/bnpl-eligibility"

// Which instalment gateways apply, so the storefront shows only eligible
// widgets and payment options. ?product_ids=a,b and/or ?cart_id=...
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productIds = String(req.query.product_ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100)
  const cartId = typeof req.query.cart_id === "string" ? req.query.cart_id : null
  res.json({
    products: await productsEligibility(req.scope, productIds),
    cart: cartId ? await cartEligibility(req.scope, cartId) : null,
  })
}
