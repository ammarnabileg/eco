import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ProductTraits, rankRecommendations } from "./score"

// Personal product picks for the storefront: "picked for you" from purchases
// and recently viewed products, and "buy again" from past orders. Read-only.

type Query = { graph: (q: Record<string, unknown>) => Promise<{ data: unknown[] }> }

const SALES_DAYS = 90
const SALES_TTL_MS = 10 * 60 * 1000
let salesCache: { at: number; sales: Record<string, number> } | null = null

/** Units sold per product over the last 90 days (cached for 10 minutes). */
async function recentSales(query: Query) {
  if (salesCache && Date.now() - salesCache.at < SALES_TTL_MS) return salesCache.sales
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "items.product_id", "items.quantity"],
    filters: { created_at: { $gte: new Date(Date.now() - SALES_DAYS * 24 * 3600 * 1000) } },
    pagination: { take: 1000, order: { created_at: "DESC" } },
  })
  const sales: Record<string, number> = {}
  for (const o of data as { items?: { product_id?: string | null; quantity?: number }[] }[]) {
    for (const i of o.items ?? []) if (i.product_id) sales[i.product_id] = (sales[i.product_id] ?? 0) + Number(i.quantity ?? 1)
  }
  salesCache = { at: Date.now(), sales }
  return sales
}

export const clearRecommendationCache = () => {
  salesCache = null
}

async function traits(query: Query, ids: string[]): Promise<ProductTraits[]> {
  if (!ids.length) return []
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "status", "categories.id", "brand.id"],
    filters: { id: ids },
  })
  return (data as { id: string; categories?: { id: string }[]; brand?: { id: string } | null }[]).map((p) => ({
    id: p.id,
    categories: (p.categories ?? []).map((c) => c.id),
    brand: p.brand?.id ?? null,
  }))
}

/** Published products in these categories or by these brands. */
async function related(query: Query, categoryIds: string[], brandIds: string[]): Promise<ProductTraits[]> {
  const ids = new Set<string>()
  if (categoryIds.length) {
    const { data } = await query.graph({ entity: "product_category", fields: ["id", "products.id"], filters: { id: categoryIds } })
    for (const c of data as { products?: { id: string }[] }[]) for (const p of c.products ?? []) ids.add(p.id)
  }
  if (brandIds.length) {
    const { data } = await query.graph({ entity: "brand", fields: ["id", "products.id"], filters: { id: brandIds } })
    for (const b of data as { products?: { id: string }[] }[]) for (const p of b.products ?? []) ids.add(p.id)
  }
  return publishedTraits(query, [...ids].slice(0, 300))
}

async function publishedTraits(query: Query, ids: string[]) {
  if (!ids.length) return []
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "status", "categories.id", "brand.id"],
    filters: { id: ids, status: "published" },
  })
  return (data as { id: string; categories?: { id: string }[]; brand?: { id: string } | null }[]).map((p) => ({
    id: p.id,
    categories: (p.categories ?? []).map((c) => c.id),
    brand: p.brand?.id ?? null,
  }))
}

export type Recommendations = {
  for_you: string[]
  buy_again: string[]
  based_on: "orders" | "views" | "popular"
}

export async function recommendProducts(
  container: MedusaContainer,
  input: { customerId?: string | null; viewedIds: string[]; limit: number }
): Promise<Recommendations> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query

  // Products from the customer's last 20 orders, most recent first.
  let purchasedIds: string[] = []
  if (input.customerId) {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "created_at", "items.product_id"],
      filters: { customer_id: input.customerId },
      pagination: { take: 20, order: { created_at: "DESC" } },
    })
    purchasedIds = [
      ...new Set((data as { items?: { product_id?: string | null }[] }[]).flatMap((o) => (o.items ?? []).map((i) => i.product_id ?? ""))),
    ].filter(Boolean)
  }
  const viewedIds = input.viewedIds.filter((id) => !purchasedIds.includes(id)).slice(0, 12)

  const [purchased, viewed, sales] = await Promise.all([traits(query, purchasedIds), traits(query, viewedIds), recentSales(query)])
  const seeds = [...purchased, ...viewed]
  const candidates = await related(
    query,
    [...new Set(seeds.flatMap((p) => p.categories))],
    [...new Set(seeds.map((p) => p.brand).filter((b): b is string => !!b))]
  )
  // Fill up with best sellers, so the section is never short.
  const popular = await publishedTraits(
    query,
    Object.entries(sales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([id]) => id)
  )
  const forYou = rankRecommendations({ candidates: [...candidates, ...popular], purchased, viewed, sales, limit: input.limit })
  const published = new Set((await publishedTraits(query, purchasedIds)).map((p) => p.id))

  return {
    for_you: forYou,
    buy_again: purchasedIds.filter((id) => published.has(id)).slice(0, input.limit),
    based_on: purchased.length ? "orders" : viewed.length ? "views" : "popular",
  }
}
