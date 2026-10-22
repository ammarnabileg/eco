"use client"

import { useState } from "react"

import { useT } from "@i18n/client"
import { WISHLIST_KEY, useSavedIds } from "@modules/tools/lib/saved-ids"

export const HeartIcon = ({ filled, size = 20 }: { filled?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
)

/** Heart toggle saving the product to the browser's wishlist. */
export default function WishlistButton({
  productId,
  variant = "icon",
  className = "",
}: {
  productId: string
  /** "icon": round button for cards; "full": icon + text for the product page. */
  variant?: "icon" | "full"
  className?: string
}) {
  const t = useT()
  const { has, toggle, ready } = useSavedIds(WISHLIST_KEY)
  const [full, setFull] = useState(false)
  const saved = ready && has(productId)
  const label = full ? t("tools.wishlist_full") : saved ? t("tools.wishlist_remove") : t("tools.wishlist_add")

  const onClick = () => {
    if (!toggle(productId)) {
      setFull(true)
      setTimeout(() => setFull(false), 2500)
    }
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${
          saved ? "border-laly-red text-laly-red bg-white" : "border-laly-line text-laly-ink bg-white hover:border-laly-teal hover:text-laly-teal"
        } ${className}`}
        data-testid="wishlist-button"
      >
        <HeartIcon filled={saved} size={18} />
        <span aria-live="polite">{full ? t("tools.wishlist_full") : saved ? t("tools.wishlist_saved") : t("tools.wishlist_save")}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`w-9 h-9 rounded-full flex items-center justify-center bg-white border border-laly-line transition-colors ${
        saved ? "text-laly-red" : "text-laly-mut hover:text-laly-red"
      } ${className}`}
      data-testid="wishlist-button"
    >
      <HeartIcon filled={saved} size={18} />
    </button>
  )
}
