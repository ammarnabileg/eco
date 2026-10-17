import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"

// Hosted-checkout gateways (KlickPay, Taly, Deema) send the customer back to
// the store, which places the order. A customer who pays and closes the tab
// never comes back, and not every gateway's webhook carries our reference.
// This job completes those carts: completing a cart asks the gateway for the
// payment status, so an unpaid cart simply stays open.

const PROVIDERS = ["pp_klickpay_", "pp_taly_", "pp_deema_"]
// Leave customers time to come back on their own, then keep trying for a day.
const MIN_AGE_MS = 3 * 60 * 1000
const MAX_AGE_MS = 24 * 60 * 60 * 1000

type SessionRow = {
  id: string
  provider_id: string
  status: string
  created_at: string | Date
  payment_collection?: { cart?: { id: string; completed_at?: string | Date | null } | null } | null
}

export default async function reconcileRedirectPayments(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const now = Date.now()

  const { data } = await query.graph({
    entity: "payment_session",
    fields: ["id", "provider_id", "status", "created_at", "payment_collection.cart.id", "payment_collection.cart.completed_at"],
    filters: {
      status: ["pending", "requires_more"],
      created_at: { $gte: new Date(now - MAX_AGE_MS), $lte: new Date(now - MIN_AGE_MS) },
    },
  })

  const carts = new Set<string>()
  for (const s of data as SessionRow[]) {
    const cart = s.payment_collection?.cart
    if (PROVIDERS.some((p) => s.provider_id.startsWith(p)) && cart?.id && !cart.completed_at) {
      carts.add(cart.id)
    }
  }

  let completed = 0
  for (const cartId of carts) {
    try {
      await completeCartWorkflow(container).run({ input: { id: cartId } })
      completed++
    } catch {
      // Not paid (yet): the gateway said so during authorization.
    }
  }
  if (completed) {
    logger.info(`Payments: completed ${completed} paid cart(s) whose customers did not return`)
  }
}

export const config = {
  name: "reconcile-redirect-payments",
  schedule: "*/5 * * * *",
}
