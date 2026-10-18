import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Which products may be paid in instalments, per gateway. Stored as
// metadata.bnpl = { deema?: "allow" | "deny", taly?: "allow" | "deny" } on
// products and categories; a missing value means "inherit". Default: deny.
//
// Order of decision for one product and one gateway:
//   1. the product's own explicit value;
//   2. its categories, each resolved up its parent chain until one has a
//      value; any category resolving to "deny" wins over "allow";
//   3. nothing anywhere: deny.

export const BNPL_GATEWAYS = ["deema", "taly"] as const
export type BnplGateway = (typeof BNPL_GATEWAYS)[number]
export type BnplRule = "allow" | "deny"

/** Gateway of a payment provider id, or null when it is not instalments. */
export const bnplGatewayOf = (providerId: string | null | undefined): BnplGateway | null =>
  providerId?.startsWith("pp_deema_") ? "deema" : providerId?.startsWith("pp_taly_") ? "taly" : null

export const ruleOf = (metadata: unknown, gateway: BnplGateway): BnplRule | null => {
  const v = (metadata as { bnpl?: Record<string, unknown> } | null)?.bnpl?.[gateway]
  return v === "allow" || v === "deny" ? v : null
}

export type CategoryNode = { id: string; parent_category_id: string | null; metadata: unknown }

/** A category's rule, inherited from its parents when it has none. */
export function categoryRule(
  id: string,
  gateway: BnplGateway,
  categories: Map<string, CategoryNode>
): BnplRule | null {
  const seen = new Set<string>()
  let current = categories.get(id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    const rule = ruleOf(current.metadata, gateway)
    if (rule) return rule
    current = current.parent_category_id ? categories.get(current.parent_category_id) : undefined
  }
  return null
}

export function productAllows(
  product: { metadata: unknown; category_ids: string[] },
  gateway: BnplGateway,
  categories: Map<string, CategoryNode>
): boolean {
  const own = ruleOf(product.metadata, gateway)
  if (own) return own === "allow"
  const rules = product.category_ids.map((id) => categoryRule(id, gateway, categories))
  if (rules.includes("deny")) return false
  return rules.includes("allow")
}

export type ProductEligibility = Record<BnplGateway, boolean>

/** Eligibility per gateway for each product id (unknown products: none). */
export async function productsEligibility(
  container: MedusaContainer,
  productIds: string[]
): Promise<Record<string, ProductEligibility>> {
  const ids = [...new Set(productIds.filter(Boolean))]
  const none = (): ProductEligibility => ({ deema: false, taly: false })
  if (!ids.length) return {}
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: products }, { data: cats }] = await Promise.all([
    query.graph({ entity: "product", fields: ["id", "metadata", "categories.id"], filters: { id: ids } }),
    // The whole tree is small (dozens of rows) and needed for inheritance.
    query.graph({ entity: "product_category", fields: ["id", "parent_category_id", "metadata"] }),
  ])
  const categories = new Map((cats as CategoryNode[]).map((c) => [c.id, c]))
  const out: Record<string, ProductEligibility> = Object.fromEntries(ids.map((id) => [id, none()]))
  for (const p of products as { id: string; metadata: unknown; categories?: ({ id: string } | null)[] | null }[]) {
    const product = { metadata: p.metadata, category_ids: (p.categories ?? []).filter(Boolean).map((c) => c!.id) }
    out[p.id] = { deema: productAllows(product, "deema", categories), taly: productAllows(product, "taly", categories) }
  }
  return out
}

/** Whether every product in the cart allows each gateway (empty cart: no). */
export async function cartEligibility(container: MedusaContainer, cartId: string): Promise<ProductEligibility> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "cart", fields: ["id", "items.product_id"], filters: { id: cartId } })
  const productIds = ((data[0]?.items ?? []) as ({ product_id: string | null } | null)[]).map((i) => i?.product_id ?? "")
  const perProduct = await productsEligibility(container, productIds)
  const list = Object.values(perProduct)
  // A line without a product (custom item) is not eligible.
  const complete = productIds.length > 0 && productIds.every(Boolean)
  return {
    deema: complete && list.length > 0 && list.every((e) => e.deema),
    taly: complete && list.length > 0 && list.every((e) => e.taly),
  }
}
