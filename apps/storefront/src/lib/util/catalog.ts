import { HttpTypes } from "@medusajs/types"

// Catalog data the backend links to products (brand, details, add-ons) and
// the spec templates behind the storefront filters.

export const CATALOG_PRODUCT_FIELDS =
  "+brand.*,+product_detail.*,+addon_groups.*,+addon_groups.options.*"

export type LocalizedText = { ar: string; en: string }
export type SpecValue = string | number | boolean | string[] | LocalizedText

export type FaqEntry = {
  question_ar: string
  answer_ar: string
  question_en: string
  answer_en: string
}

export type ProductDetail = {
  title_en?: string | null
  subtitle_ar?: string | null
  subtitle_en?: string | null
  description_en?: string | null
  highlights_ar?: string[] | null
  highlights_en?: string[] | null
  specs?: Record<string, SpecValue> | null
  faq?: FaqEntry[] | null
  seo_title_ar?: string | null
  seo_title_en?: string | null
  seo_description_ar?: string | null
  seo_description_en?: string | null
  mpn?: string | null
  series?: string | null
  price_on_request?: boolean | null
  warranty_months?: number | null
  source_url?: string | null
}

export type Brand = {
  id: string
  name: string
  handle?: string
  logo_url?: string | null
  description_ar?: string | null
  /** Published products of the brand (brands list only). */
  product_count?: number
}

export type AddonOption = {
  id: string
  name_ar: string
  name_en: string
  price: number | string
  is_active?: boolean
  rank?: number
}

export type AddonGroup = {
  id: string
  name_ar: string
  name_en: string
  kind?: string
  selection: "single" | "multiple"
  is_required?: boolean
  rank?: number
  options?: AddonOption[] | null
}

export type SpecOption = { value: string; label_ar: string; label_en: string }

export type SpecAttribute = {
  key: string
  label_ar: string
  label_en: string
  type: "text" | "number" | "boolean" | "select" | "multiselect"
  unit?: string | null
  options?: SpecOption[]
  group_ar?: string | null
  group_en?: string | null
  filterable?: boolean
}

export type SpecRow = {
  key: string
  label_ar: string
  label_en: string
  value_ar: string
  value_en: string
  filterable?: boolean
}

export type SpecGroup = {
  group_ar: string | null
  group_en: string | null
  rows: SpecRow[]
}

/** A line item's chosen add-ons, as the configured-items route stores them. */
export type LineAddon = {
  option_id: string
  group_ar: string
  group_en: string
  name_ar: string
  name_en: string
  price: number
}

type CatalogProduct = HttpTypes.StoreProduct & {
  brand?: Brand | null
  product_detail?: ProductDetail | null
  addon_groups?: AddonGroup[] | null
}

export const productBrand = (product: HttpTypes.StoreProduct) =>
  (product as CatalogProduct).brand ?? null

export const productDetail = (product: HttpTypes.StoreProduct) =>
  (product as CatalogProduct).product_detail ?? null

export const isPriceOnRequest = (product: HttpTypes.StoreProduct) =>
  !!productDetail(product)?.price_on_request

/** Active add-on groups with active options, in display order. */
export const productAddonGroups = (
  product: HttpTypes.StoreProduct
): AddonGroup[] =>
  ((product as CatalogProduct).addon_groups ?? [])
    .filter(Boolean)
    .map((g) => ({
      ...g,
      options: (g.options ?? [])
        .filter((o) => o && o.is_active !== false)
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    }))
    .filter((g) => g.options.length > 0)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

export const lineAddons = (metadata: unknown): LineAddon[] => {
  const addons = (metadata as { addons?: unknown } | null)?.addons
  return Array.isArray(addons) ? (addons as LineAddon[]) : []
}

/**
 * Splits a "key:value" spec facet and labels both sides from the template:
 * the option's Arabic label, or the raw value plus unit.
 */
export const labelSpecFacet = (facet: string, attributes: SpecAttribute[]) => {
  const separator = facet.indexOf(":")
  if (separator < 1) {
    return null
  }
  const key = facet.slice(0, separator)
  const value = facet.slice(separator + 1)
  const attr = attributes.find((a) => a.key === key)
  if (!attr) {
    return null
  }
  const option = attr.options?.find((o) => o.value === value)
  const label =
    attr.type === "boolean"
      ? value === "true"
        ? "نعم"
        : "لا"
      : option
      ? option.label_ar
      : `${value}${attr.unit ? ` ${attr.unit}` : ""}`
  return { key, attr, label }
}
