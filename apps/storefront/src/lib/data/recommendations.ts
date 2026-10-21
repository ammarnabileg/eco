"use server"

import { sdk } from "@lib/config"
import { parseViewed, VIEWED_COOKIE } from "@lib/util/recently-viewed"
import { cookies as nextCookies } from "next/headers"

import { getAuthHeaders } from "./cookies"

export type Recommendations = {
  viewed: string[]
  for_you: string[]
  buy_again: string[]
  based_on: "orders" | "views" | "popular"
}

const EMPTY: Recommendations = { viewed: [], for_you: [], buy_again: [], based_on: "popular" }

/** Personal picks from this visitor's recent views and, when signed in, orders. */
export const getRecommendations = async (limit = 8): Promise<Recommendations> => {
  const viewed = parseViewed((await nextCookies()).get(VIEWED_COOKIE)?.value)
  return sdk.client
    .fetch<Omit<Recommendations, "viewed">>("/store/recommendations", {
      method: "GET",
      query: { limit, ...(viewed.length ? { viewed: viewed.join(",") } : {}) },
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    .then((r) => ({ ...r, viewed }))
    .catch(() => ({ ...EMPTY, viewed }))
}
