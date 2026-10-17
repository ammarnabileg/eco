"use server"

import { sdk } from "@lib/config"
import type { SpecAttribute, Brand, SpecGroup } from "@lib/util/catalog"
import { getAuthHeaders } from "./cookies"

export type CatalogFilters = { attributes: SpecAttribute[]; brands: Brand[] }

/** Filterable spec fields of a category (labels for search facets) and brands. */
export async function getCatalogFilters(
  categoryId?: string
): Promise<CatalogFilters> {
  return sdk.client
    .fetch<CatalogFilters>("/store/catalog/filters", {
      query: categoryId ? { category_id: categoryId } : {},
      next: { revalidate: 60 },
    })
    .catch(() => ({ attributes: [], brands: [] }))
}

/** A product's full spec table, grouped and already labelled by the backend. */
export async function getProductSpecs(productId: string): Promise<SpecGroup[]> {
  return sdk.client
    .fetch<{ groups: SpecGroup[] }>(
      `/store/catalog/products/${productId}/specs`,
      {
        next: { revalidate: 60 },
      }
    )
    .then(({ groups }) => groups.filter((g) => g.rows.length > 0))
    .catch(() => [])
}

export type QuoteRequestInput = {
  product_id: string
  variant_id?: string | null
  customer_name: string
  phone: string
  quantity?: number
  message?: string | null
  website?: string
}

export type QuoteRequestResult = { ok: true } | { ok: false; error: string }

export async function submitQuoteRequest(
  input: QuoteRequestInput
): Promise<QuoteRequestResult> {
  const headers = { ...(await getAuthHeaders()) }
  return sdk.client
    .fetch("/store/quote-requests", {
      method: "POST",
      body: {
        product_id: input.product_id,
        variant_id: input.variant_id || undefined,
        customer_name: input.customer_name.trim(),
        phone: input.phone.trim(),
        quantity: input.quantity,
        message: input.message?.trim() || undefined,
        locale: "ar",
        website: input.website ?? "",
      },
      headers,
    })
    .then(() => ({ ok: true as const }))
    .catch((e: Error) => ({ ok: false as const, error: e.message }))
}
