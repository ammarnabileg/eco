import type { MetadataRoute } from "next"

import { sdk } from "@lib/config"
import { listBrands } from "@lib/data/catalog"
import { getStoreContent } from "@lib/data/content"
import { getBaseURL } from "@lib/util/env"

// Pages search engines should find: the main sections, published
// information pages, categories and every product. Refreshed hourly.
export const revalidate = 3600

const COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_REGION || "kw"

async function all<T>(path: string, key: string, fields: string): Promise<T[]> {
  const out: T[] = []
  for (let offset = 0; offset < 5000; offset += 200) {
    const page = await sdk.client
      .fetch<Record<string, unknown>>(path, { query: { fields, limit: 200, offset }, next: { revalidate } })
      .catch(() => null)
    const rows = (page?.[key] as T[] | undefined) ?? []
    out.push(...rows)
    if (rows.length < 200) break
  }
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `${getBaseURL().replace(/\/$/, "")}/${COUNTRY}`
  const [{ pages = [] }, brands, categories, products] = await Promise.all([
    getStoreContent(),
    listBrands(),
    all<{ handle: string }>("/store/product-categories", "product_categories", "handle"),
    all<{ handle: string; updated_at?: string }>("/store/products", "products", "handle,updated_at"),
  ])
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...["/store", "/categories", "/brands", "/offers", "/contact"].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...brands.map((b) => ({ url: `${base}/brands/${b.handle}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...pages.map((p) => ({ url: `${base}/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.4 })),
    ...categories.map((c) => ({ url: `${base}/categories/${c.handle}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({
      url: `${base}/products/${p.handle}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
