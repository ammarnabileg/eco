import type { MetadataRoute } from "next"

import { getBaseURL } from "@lib/util/env"

// Shopping pages are open; carts, checkout and accounts are not worth indexing.
export default function robots(): MetadataRoute.Robots {
  const base = getBaseURL().replace(/\/$/, "")
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/*/cart", "/*/checkout", "/*/account", "/*/order/"] },
    sitemap: `${base}/sitemap.xml`,
  }
}
