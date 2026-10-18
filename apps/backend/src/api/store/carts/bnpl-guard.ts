import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { bnplGatewayOf, cartEligibility } from "../../../lib/bnpl-eligibility"

// Instalment eligibility enforced on the server, on top of hiding the
// gateway in the storefront. Payment logic, webhooks and refunds are not
// touched: these only refuse a request before it reaches them.

const notEligible = () =>
  new MedusaError(MedusaError.Types.NOT_ALLOWED, "Instalments are not available for some products in this cart")

/** POST /store/payment-collections/:id/payment-sessions */
export async function guardBnplSession(
  req: MedusaRequest<{ provider_id?: string }>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const gateway = bnplGatewayOf(req.body?.provider_id)
  if (!gateway) return next()
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "payment_collection",
    fields: ["id", "cart.id"],
    filters: { id: req.params.id },
  })
  const cartId = (data[0] as { cart?: { id: string } | null } | undefined)?.cart?.id
  if (!cartId || !(await cartEligibility(req.scope, cartId))[gateway]) {
    return next(notEligible())
  }
  next()
}

/** POST /store/carts/:id/complete: the cart may have changed since paying started. */
export async function guardBnplComplete(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "payment_collection.payment_sessions.provider_id"],
    filters: { id: req.params.id },
  })
  const sessions = ((data[0] as { payment_collection?: { payment_sessions?: { provider_id: string }[] } } | undefined)
    ?.payment_collection?.payment_sessions ?? [])
  const gateways = [...new Set(sessions.map((s) => bnplGatewayOf(s.provider_id)).filter(Boolean))]
  if (gateways.length) {
    const eligible = await cartEligibility(req.scope, req.params.id)
    if (gateways.some((g) => !eligible[g!])) {
      return next(notEligible())
    }
  }
  next()
}
