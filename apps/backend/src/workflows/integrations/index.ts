import { MedusaContainer } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { setRegionsPaymentProvidersStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"

import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import { listOf } from "../../modules/payment-klickpay/service"
import IntegrationsModuleService, { IntegrationInput } from "../../modules/integrations/service"
import { resolveIntegration } from "../../modules/integrations/store"

const service = (container: MedusaContainer) => container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)

export type SaveIntegrationInput = IntegrationInput & { key: string }

const saveIntegrationStep = createStep(
  "save-integration",
  async (input: SaveIntegrationInput, { container }) => {
    const svc = service(container)
    const previous = await svc.saveIntegration(input.key, input)
    return new StepResponse(input.key, { key: input.key, previous })
  },
  async (undo, { container }) => {
    if (undo) {
      await service(container).restoreIntegration(undo.key, undo.previous)
    }
  }
)

// Payment providers belonging to each gateway integration.
const GATEWAY_PREFIX: Record<string, string> = { klickpay: "pp_klickpay_", taly: "pp_taly_", deema: "pp_deema_" }

/** The gateway's providers customers should see now (empty when switched off). */
const gatewayProvidersStep = createStep("gateway-providers", async (key: string, { container }) => {
  const prefix = GATEWAY_PREFIX[key]
  if (!prefix) {
    return new StepResponse(null)
  }
  const resolved = resolveIntegration(key, await service(container).findRow(key))
  const ids = !resolved.active
    ? []
    : key === "klickpay"
      ? listOf(resolved.values.methods).map((m) => `${prefix}${m}`)
      : [`${prefix}${key}`]
  return new StepResponse({ prefix, ids })
})

export const saveIntegrationWorkflow = createWorkflow("save-integration", (input: SaveIntegrationInput) => {
  const key = saveIntegrationStep(input)
  const gateway = gatewayProvidersStep(key)
  const { data: regions } = useQueryGraphStep({
    entity: "region",
    fields: ["id", "payment_providers.id"],
    filters: { currency_code: "kwd" },
  })
  // Keep every other provider of the region; replace only this gateway's.
  const regionProviders = transform({ gateway, regions }, ({ gateway, regions }) =>
    gateway
      ? regions.map((r: { id: string; payment_providers?: ({ id: string } | null)[] | null }) => ({
          id: r.id,
          payment_providers: [
            ...new Set([
              ...(r.payment_providers ?? []).map((p) => p!.id).filter((id) => !id.startsWith(gateway.prefix)),
              ...gateway.ids,
            ]),
          ],
        }))
      : []
  )
  when({ regionProviders }, ({ regionProviders }) => regionProviders.length > 0).then(() => {
    setRegionsPaymentProvidersStep({ input: regionProviders })
  })
  return new WorkflowResponse(key)
})
