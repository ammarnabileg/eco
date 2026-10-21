"use client"

import { addViewed, VIEWED_COOKIE } from "@lib/util/recently-viewed"
import { useEffect } from "react"

/** Remembers this product in the "recently viewed" cookie (30 days). */
export default function TrackViewed({ productId }: { productId: string }) {
  useEffect(() => {
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${VIEWED_COOKIE}=`))
      ?.slice(VIEWED_COOKIE.length + 1)
    const next = addViewed(current ? decodeURIComponent(current) : null, productId)
    document.cookie = `${VIEWED_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
  }, [productId])
  return null
}
