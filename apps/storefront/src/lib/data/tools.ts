"use server"

import { getLocale } from "@i18n/server"
import { intlLocale } from "@i18n/config"
import { getProductSpecs, } from "@lib/data/catalog"
import { listProducts } from "@lib/data/products"
import { isPriceOnRequest, productBrand } from "@lib/util/catalog"
import { categoryName } from "@lib/util/category-name"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { productText } from "@modules/products/lib/product-text"

// Products saved in the browser (wishlist, compare), loaded by id with the
// region's prices. Unknown or unpublished ids are simply missing.

export type ToolProduct = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  brand: string | null
  price: string | null
  originalPrice: string | null
  onSale: boolean
  onRequest: boolean
  /** Set when the product has a single variant (it can go straight to the cart). */
  variantId: string | null
  inStock: boolean
  categoryId: string | null
  categoryName: string | null
}

export type CompareRow = { key: string; group: string | null; label: string; values: (string | null)[] }

const FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+metadata,+product_detail.*,+brand.*,*categories"

const ID = /^prod_[A-Za-z0-9]+$/

const isInStock = (v?: HttpTypes.StoreProductVariant) =>
  !!v && (!v.manage_inventory || !!v.allow_backorder || (v.inventory_quantity ?? 0) > 0)

const cleanIds = (ids: unknown, max: number) =>
  Array.isArray(ids)
    ? Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && ID.test(id)))).slice(0, max)
    : []

async function load(ids: string[], countryCode: string) {
  if (!ids.length) return []
  const { response } = await listProducts({
    countryCode,
    queryParams: { id: ids, limit: ids.length, fields: FIELDS },
  }).catch(() => ({ response: { products: [] as HttpTypes.StoreProduct[] } }))
  const byId = new Map(response.products.map((p) => [p.id, p]))
  return ids.map((id) => byId.get(id)).filter((p): p is HttpTypes.StoreProduct => !!p)
}

function toTool(product: HttpTypes.StoreProduct, locale: Awaited<ReturnType<typeof getLocale>>): ToolProduct {
  const { cheapestPrice } = getProductPrice({ product, locale: intlLocale(locale) })
  const variants = product.variants ?? []
  const only = variants.length === 1 ? variants[0] : undefined
  const category = product.categories?.[0]
  return {
    id: product.id,
    handle: product.handle ?? "",
    title: productText(product, locale).title,
    thumbnail: product.thumbnail || product.images?.[0]?.url || null,
    brand: productBrand(product)?.name ?? null,
    price: cheapestPrice?.calculated_price ?? null,
    originalPrice: cheapestPrice?.original_price ?? null,
    onSale: cheapestPrice?.price_type === "sale",
    onRequest: isPriceOnRequest(product),
    variantId: only?.id ?? null,
    inStock: variants.some(isInStock),
    categoryId: category?.id ?? null,
    categoryName: category ? categoryName(category, locale) : null,
  }
}

/** Wishlist / compare tray items, in the order they were saved. */
export async function getToolProducts(ids: string[], countryCode: string): Promise<ToolProduct[]> {
  const [products, locale] = await Promise.all([load(cleanIds(ids, 100), countryCode), getLocale()])
  return products.map((p) => toTool(p, locale))
}

/**
 * The compare table: up to 4 products and every spec row any of them has
 * (labels in the page's language, null where a product lacks the row).
 */
export async function getCompareData(
  ids: string[],
  countryCode: string
): Promise<{ products: ToolProduct[]; rows: CompareRow[] }> {
  const [products, locale] = await Promise.all([load(cleanIds(ids, 4), countryCode), getLocale()])
  const specs = await Promise.all(products.map((p) => getProductSpecs(p.id)))
  const en = locale !== "ar"
  const rows = new Map<string, CompareRow>()
  specs.forEach((groups, i) => {
    for (const g of groups) {
      for (const r of g.rows) {
        let row = rows.get(r.key)
        if (!row) {
          row = {
            key: r.key,
            group: (en ? g.group_en || g.group_ar : g.group_ar || g.group_en) || null,
            label: (en ? r.label_en || r.label_ar : r.label_ar || r.label_en) || r.key,
            values: products.map(() => null),
          }
          rows.set(r.key, row)
        }
        const value = en ? r.value_en || r.value_ar : r.value_ar || r.value_en
        row.values[i] = value?.trim() ? value : null
      }
    }
  })
  // Keep rows of the same group together, groups in first-seen order.
  const order = new Map<string | null, number>()
  const list = Array.from(rows.values())
  list.forEach((r) => order.has(r.group) || order.set(r.group, order.size))
  list.sort((a, b) => order.get(a.group)! - order.get(b.group)!)
  return { products: products.map((p) => toTool(p, locale)), rows: list }
}
