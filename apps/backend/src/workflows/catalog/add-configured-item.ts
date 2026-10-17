import { ContainerRegistrationKeys, MedusaError, QueryContext } from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { AddonGroupRow, resolveAddonSelection, roundMoney } from "../../modules/catalog/addons"

export type AddConfiguredItemInput = {
  cart_id: string
  variant_id: string
  quantity: number
  addon_option_ids: string[]
}

type VariantRow = {
  id: string
  product?: {
    id: string
    product_detail?: { price_on_request?: boolean | null } | null
    addon_groups?: (AddonGroupRow | null)[] | null
  } | null
  calculated_price?: { calculated_amount?: number | null } | null
}

/**
 * Prices a product with its chosen add-ons on the server. The line keeps the
 * variant (stock, fulfilment, offers) and records the add-ons in metadata;
 * its unit price is the variant price plus the add-ons, fixed at add time.
 */
const priceConfigurationStep = createStep(
  "price-configuration",
  async (input: AddConfiguredItemInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "region_id", "currency_code", "customer_id", "completed_at"],
      filters: { id: input.cart_id },
    })
    const cart = carts[0]
    if (!cart || cart.completed_at) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
    }
    const { data } = await query.graph({
      entity: "variant",
      fields: [
        "id",
        "product.id",
        "product.product_detail.price_on_request",
        "product.addon_groups.*",
        "product.addon_groups.options.*",
        "calculated_price.calculated_amount",
      ],
      filters: { id: input.variant_id },
      context: {
        calculated_price: QueryContext({
          region_id: cart.region_id,
          currency_code: cart.currency_code,
          customer_id: cart.customer_id,
        }),
      },
    })
    const variant = data[0] as VariantRow | undefined
    if (!variant?.product) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Variant not found")
    }
    if (variant.product.product_detail?.price_on_request) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This product is sold by quotation")
    }
    const base = variant.calculated_price?.calculated_amount
    if (base === null || base === undefined) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "This product has no price in your region")
    }
    const groups = (variant.product.addon_groups ?? []).filter((g): g is AddonGroupRow => !!g)
    const { selected, total, errors } = resolveAddonSelection(groups, input.addon_option_ids)
    if (errors.length) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errors.join("; "))
    }
    return new StepResponse({
      unit_price: selected.length ? roundMoney(Number(base) + total) : undefined,
      metadata: selected.length ? { addons: selected, addons_total: total } : undefined,
    })
  }
)

export const addConfiguredItemWorkflow = createWorkflow(
  "add-configured-item",
  (input: AddConfiguredItemInput) => {
    const priced = priceConfigurationStep(input)
    const addInput = transform({ input, priced }, ({ input, priced }) => ({
      cart_id: input.cart_id,
      items: [
        {
          variant_id: input.variant_id,
          quantity: input.quantity,
          unit_price: priced.unit_price,
          metadata: priced.metadata,
        },
      ],
    }))
    addToCartWorkflow.runAsStep({ input: addInput })
    return new WorkflowResponse(priced)
  }
)
