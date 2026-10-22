import "server-only"

import { cache } from "react"

import { sdk } from "@lib/config"

import { BnplEligibility, BnplListing, EMPTY_BNPL_LISTING } from "./bnpl-offer"

const MAX_IDS = 100 // the backend's limit per request

/**
 * Instalment eligibility for many products in one GET /store/bnpl. Admin
 * settings are cached for a minute. Failing closed: on error nothing is
 * eligible, so cards just show no instalment line.
 */
export async function fetchBnplListing(productIds: string[]): Promise<BnplListing> {
  const ids = Array.from(new Set(productIds.filter(Boolean)))
  if (!ids.length) return EMPTY_BNPL_LISTING
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += MAX_IDS) chunks.push(ids.slice(i, i + MAX_IDS))
  const parts = await Promise.all(
    chunks.map((chunk) =>
      sdk.client
        .fetch<BnplListing>("/store/bnpl", {
          method: "GET",
          query: { product_ids: chunk.join(",") },
          next: { revalidate: 60, tags: ["bnpl"] },
          cache: "force-cache",
        })
        .catch(() => EMPTY_BNPL_LISTING)
    )
  )
  return {
    products: Object.assign({}, ...parts.map((p) => p.products ?? {})),
    gateways: parts.find((p) => Object.keys(p.gateways ?? {}).length)?.gateways ?? {},
  }
}

type Batch = { ids: Set<string>; result: Promise<BnplListing> }

/**
 * One loader per server request. Cards ask for their own product; the ids
 * asked for within the same tick are sent together, so a grid of cards costs
 * one request instead of one per card.
 */
const requestLoader = cache(() => {
  let open: Batch | null = null
  return (productId: string): Promise<{ eligibility: BnplEligibility | undefined; listing: BnplListing }> => {
    if (!open) {
      const batch: Batch = {
        ids: new Set(),
        result: new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
          open = null
          return fetchBnplListing(Array.from(batch.ids))
        }),
      }
      open = batch
    }
    open.ids.add(productId)
    return open.result.then((listing) => ({ eligibility: listing.products[productId], listing }))
  }
})

/** The listing data a single card needs (its product plus gateway terms). */
export const getCardBnpl = async (productId: string): Promise<BnplListing> => {
  const { eligibility, listing } = await requestLoader()(productId)
  return { products: eligibility ? { [productId]: eligibility } : {}, gateways: listing.gateways }
}
