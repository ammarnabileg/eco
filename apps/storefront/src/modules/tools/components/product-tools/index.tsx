import CompareButton from "@modules/tools/components/compare-button"
import WishlistButton from "@modules/tools/components/wishlist-button"

/** Wishlist + compare buttons side by side (product cards and product page). */
export default function ProductToolButtons({
  productId,
  variant = "icon",
  className = "",
}: {
  productId: string
  variant?: "icon" | "full"
  className?: string
}) {
  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className}`}>
      <WishlistButton productId={productId} variant={variant} />
      <CompareButton productId={productId} variant={variant} />
    </div>
  )
}
