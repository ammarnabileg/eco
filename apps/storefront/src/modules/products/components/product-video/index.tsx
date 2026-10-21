import { HttpTypes } from "@medusajs/types"

/** The product video the admin approved (metadata.video_url), under the photos. */
export default function ProductVideo({ product }: { product: HttpTypes.StoreProduct }) {
  const url = product.metadata?.video_url
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) return null
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      poster={product.thumbnail ?? undefined}
      className="w-full rounded-card border border-laly-line bg-white"
      data-testid="product-video"
    />
  )
}
