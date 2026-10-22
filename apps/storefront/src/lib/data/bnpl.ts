"use server"

import { sdk } from "@lib/config"

import { fetchBnplListing } from "./bnpl-batch"
import type { BnplListing } from "./bnpl-offer"

// Instalment eligibility decided by the backend (product and category
// settings in the admin). Failing closed: on error nothing is eligible.

export type BnplEligibility = { deema: boolean; taly: boolean }
const NONE: BnplEligibility = { deema: false, taly: false }

export const getProductBnpl = async (productId: string): Promise<BnplEligibility> =>
  sdk.client
    .fetch<{ products: Record<string, BnplEligibility> }>("/store/bnpl", {
      method: "GET",
      query: { product_ids: productId },
      cache: "no-store",
    })
    .then((r) => r.products[productId] ?? NONE)
    .catch(() => NONE)

/**
 * Eligibility and gateway terms for a page of search hits, for client
 * listings: one call per page of results.
 */
export const getListingBnpl = async (productIds: string[]): Promise<BnplListing> =>
  fetchBnplListing(productIds.slice(0, 100))

export const getCartBnpl = async (cartId: string): Promise<BnplEligibility> =>
  sdk.client
    .fetch<{ cart: BnplEligibility | null }>("/store/bnpl", {
      method: "GET",
      query: { cart_id: cartId },
      cache: "no-store",
    })
    .then((r) => r.cart ?? NONE)
    .catch(() => NONE)

/** Drops instalment gateways the cart is not eligible for. */
export const filterBnplMethods = async <T extends { id: string }>(cartId: string, methods: T[]) => {
  const hasBnpl = methods.some((m) => m.id.startsWith("pp_deema_") || m.id.startsWith("pp_taly_"))
  if (!hasBnpl) return { methods, hidden: false }
  const eligible = await getCartBnpl(cartId)
  const kept = methods.filter(
    (m) => !((m.id.startsWith("pp_deema_") && !eligible.deema) || (m.id.startsWith("pp_taly_") && !eligible.taly))
  )
  return { methods: kept, hidden: kept.length < methods.length }
}
