import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

// Offers every configured gateway (KlickPay methods, Taly, Deema) in the
// KWD regions, keeping providers already attached. Re-run after enabling a
// gateway's keys.
//
//   npx medusa exec ./src/scripts/setup-payments.ts
const GATEWAYS = ["pp_klickpay_", "pp_taly_", "pp_deema_"]

export default async function setupPayments({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const { data: providers } = await query.graph({
    entity: "payment_provider",
    fields: ["id", "is_enabled"],
  })
  const gateways = providers
    .filter((p) => p.is_enabled && GATEWAYS.some((prefix) => p.id.startsWith(prefix)))
    .map((p) => p.id)
  if (!gateways.length) {
    logger.warn("Payments: no gateway is configured (set KLICKPAY_*, TALY_* or DEEMA_* and restart)")
    return
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
    filters: { currency_code: "kwd" },
  })
  for (const region of regions) {
    const current = (region.payment_providers ?? []).map((p) => p!.id)
    const next = [...new Set([...current, ...gateways])]
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: region.id }, update: { payment_providers: next } },
    })
    logger.info(`Payments: ${region.name} offers ${next.join(", ")}`)
  }
}
