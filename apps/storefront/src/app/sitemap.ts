import type { MetadataRoute } from "next"

import { sdk } from "@lib/config"
import { listBrands } from "@lib/data/catalog"
import { getStoreContent } from "@lib/data/content"
import { getBaseURL } from "@lib/util/env"
import { DEFAULT_LOCALE, Locale, LOCALES, localePath } from "@i18n/config"

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

// Every page in every language, each entry listing its other-language twins
// (hreflang) so search engines show the right one.
const ORIGIN = () => getBaseURL().replace(/\/$/, "")
const withLanguages = (entry: MetadataRoute.Sitemap[number] & { path: string }) => {
  const { path, ...rest } = entry
  const languages = Object.fromEntries(
    (Object.keys(LOCALES) as Locale[]).map((l) => [l, `${ORIGIN()}${localePath(COUNTRY, l, path)}`])
  )
  return (Object.keys(LOCALES) as Locale[]).map((l) => ({
    ...rest,
    url: `${ORIGIN()}${localePath(COUNTRY, l, path)}`,
    alternates: { languages: { ...languages, "x-default": languages[DEFAULT_LOCALE] } },
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ pages = [] }, brands, categories, products] = await Promise.all([
    getStoreContent(),
    listBrands(),
    all<{ handle: string }>("/store/product-categories", "product_categories", "handle"),
    all<{ handle: string; updated_at?: string }>("/store/products", "products", "handle,updated_at"),
  ])
  const entries: (MetadataRoute.Sitemap[number] & { path: string })[] = [
    { path: "/", url: "", changeFrequency: "daily", priority: 1 },
    ...["/store", "/categories", "/brands", "/offers", "/contact"].map((p) => ({ path: p, url: "", changeFrequency: "daily" as const, priority: 0.7 })),
    ...pages.map((p) => ({ path: `/${p.slug}`, url: "", changeFrequency: "monthly" as const, priority: 0.4 })),
    ...brands.map((b) => ({ path: `/brands/${b.handle}`, url: "", changeFrequency: "weekly" as const, priority: 0.6 })),
    ...categories.map((c) => ({ path: `/categories/${c.handle}`, url: "", changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({
      path: `/products/${p.handle}`,
      url: "",
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
  return entries.flatMap(withLanguages)
}
