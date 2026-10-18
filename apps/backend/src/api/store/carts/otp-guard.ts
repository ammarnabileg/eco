import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { otpStatus } from "../../../workflows/whatsapp"

// Guests must confirm their phone with the WhatsApp code before paying.
const needsCode = () =>
  new MedusaError(MedusaError.Types.NOT_ALLOWED, "Confirm your phone number with the WhatsApp code first")

async function check(req: MedusaRequest, cartId: string | undefined, next: MedusaNextFunction) {
  if (!cartId) return next()
  const status = await otpStatus(req.scope, cartId)
  return status.required && !status.verified ? next(needsCode()) : next()
}

/** POST /store/payment-collections/:id/payment-sessions */
export async function guardOtpSession(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "payment_collection", fields: ["cart.id"], filters: { id: req.params.id } })
  return check(req, (data[0] as { cart?: { id: string } | null } | undefined)?.cart?.id, next)
}

/** POST /store/carts/:id/complete */
export async function guardOtpComplete(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  return check(req, req.params.id, next)
}
