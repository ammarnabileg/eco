"use server"

import { sdk } from "@lib/config"

export type Offer = {
  id: string
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  product_ids: string[]
}

// Sale price lists running now (managed in the admin under Price Lists).
export const getActiveOffers = async (): Promise<Offer[]> => {
  return sdk.client
    .fetch<{ offers: Offer[] }>("/store/offers", {
      method: "GET",
      next: { revalidate: 60, tags: ["offers"] },
      cache: "force-cache",
    })
    .then(({ offers }) => offers)
    .catch(() => [])
}

// The soonest end date per product, for countdowns on cards.
export const offerEndsByProduct = async (offers: Offer[]) => {
  const ends: Record<string, string> = {}
  for (const offer of offers) {
    if (!offer.ends_at) {
      continue
    }
    for (const id of offer.product_ids) {
      if (!ends[id] || offer.ends_at < ends[id]) {
        ends[id] = offer.ends_at
      }
    }
  }
  return ends
}
