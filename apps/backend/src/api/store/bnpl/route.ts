import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { BNPL_GATEWAYS, BnplGateway, cartEligibility, productsEligibility } from "../../../lib/bnpl-eligibility"
import { readIntegration } from "../../../modules/integrations/store"

// How each gateway splits a purchase and the order amounts it accepts, in
// KWD. Taly: 4 payments ("اشتري الآن وادفع لاحقاً على 4 دفعات"), no published
// limits. Deema: 4 payments, minimum 1 KWD (the provider's own check in
// modules/payment-deema); its maximum is per merchant and not published.
// Amount limits the providers enforce. The instalment count is a promise to
// customers, so it comes from the admin's Integrations page (no count = no
// card line), never from a guess here.
const GATEWAY_LIMITS: Record<BnplGateway, { min_amount: number | null; max_amount: number | null }> = {
  taly: { min_amount: null, max_amount: null },
  deema: { min_amount: 1, max_amount: null },
}

type Pg = Parameters<typeof readIntegration>[0]

// Which instalment gateways apply, so the storefront shows only eligible
// widgets, card lines and payment options. ?product_ids=a,b (up to 100, one
// call per listing) and/or ?cart_id=... `gateways` says which gateways are
// switched on in the admin, with their instalment count and amount limits.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productIds = String(req.query.product_ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100)
  const cartId = typeof req.query.cart_id === "string" ? req.query.cart_id : null
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Pg
  const [products, cart, states] = await Promise.all([
    productsEligibility(req.scope, productIds),
    cartId ? cartEligibility(req.scope, cartId) : Promise.resolve(null),
    Promise.all(
      BNPL_GATEWAYS.map((g) =>
        readIntegration(pg, g)
          .then((r) => ({ active: r.active, instalments: Number(r.values.instalments) || 0 }))
          .catch(() => ({ active: false, instalments: 0 }))
      )
    ),
  ])
  const gateways = Object.fromEntries(
    BNPL_GATEWAYS.map((g, i) => [
      g,
      { active: states[i].active && states[i].instalments > 0, instalments: states[i].instalments, ...GATEWAY_LIMITS[g] },
    ])
  )
  res.json({ products, cart, gateways })
}
