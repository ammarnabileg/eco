import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

type LineItemBody = { variant_id?: string; metadata?: Record<string, unknown> | null }

/**
 * The core line-item routes accept free metadata and no price, so add-ons
 * there would be free and price-on-request products would sell at their
 * placeholder price. Both must go through /configured-items or a quote.
 */
export async function guardLineItems(
  req: MedusaRequest<LineItemBody>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = (req.body ?? {}) as LineItemBody
  if (body.metadata && ("addons" in body.metadata || "addons_total" in body.metadata)) {
    return next(
      new MedusaError(MedusaError.Types.NOT_ALLOWED, "Add-ons are added through /configured-items")
    )
  }
  if (body.variant_id) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "variant",
      fields: ["id", "product.product_detail.price_on_request"],
      filters: { id: body.variant_id },
    })
    if (data[0]?.product?.product_detail?.price_on_request) {
      return next(
        new MedusaError(MedusaError.Types.NOT_ALLOWED, "This product is sold by quotation")
      )
    }
  }
  next()
}
