// Ranking for "picked for you": products sharing categories and brands with
// what the customer bought (strongest) or looked at, nudged by store-wide
// sales. Pure, unit-tested.

export type ProductTraits = { id: string; categories: string[]; brand: string | null }

export type RankInput = {
  candidates: ProductTraits[]
  purchased: ProductTraits[]
  viewed: ProductTraits[]
  /** Units sold recently per product id. */
  sales: Record<string, number>
  limit: number
}

export function rankRecommendations({ candidates, purchased, viewed, sales, limit }: RankInput): string[] {
  const count = (list: ProductTraits[], pick: (p: ProductTraits) => (string | null)[]) => {
    const m = new Map<string, number>()
    for (const p of list) for (const k of pick(p)) if (k) m.set(k, (m.get(k) ?? 0) + 1)
    return m
  }
  const boughtCats = count(purchased, (p) => p.categories)
  const viewedCats = count(viewed, (p) => p.categories)
  const boughtBrands = count(purchased, (p) => [p.brand])
  const viewedBrands = count(viewed, (p) => [p.brand])
  const seen = new Set([...purchased, ...viewed].map((p) => p.id))
  const topSales = Math.max(1, ...Object.values(sales))

  const scored = new Map<string, { id: string; score: number; sold: number }>()
  for (const c of candidates) {
    if (seen.has(c.id) || scored.has(c.id)) continue
    let score = 0
    for (const cat of c.categories) score += 3 * Math.min(boughtCats.get(cat) ?? 0, 2) + 2 * Math.min(viewedCats.get(cat) ?? 0, 2)
    if (c.brand) score += 2 * Math.min(boughtBrands.get(c.brand) ?? 0, 2) + Math.min(viewedBrands.get(c.brand) ?? 0, 2)
    const sold = sales[c.id] ?? 0
    score += sold / topSales
    scored.set(c.id, { id: c.id, score, sold })
  }
  return [...scored.values()]
    .sort((a, b) => b.score - a.score || b.sold - a.sold || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((s) => s.id)
}
