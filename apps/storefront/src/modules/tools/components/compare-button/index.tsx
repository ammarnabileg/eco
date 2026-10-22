"use client"

import { useState } from "react"

import { useT } from "@i18n/client"
import { COMPARE_KEY, useSavedIds } from "@modules/tools/lib/saved-ids"

export const CompareIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
  </svg>
)

/** Adds the product to (or removes it from) the compare list, up to 4. */
export default function CompareButton({
  productId,
  variant = "icon",
  className = "",
}: {
  productId: string
  variant?: "icon" | "full"
  className?: string
}) {
  const t = useT()
  const { has, toggle, ready, max } = useSavedIds(COMPARE_KEY)
  const [full, setFull] = useState(false)
  const selected = ready && has(productId)
  const label = full
    ? t("tools.compare_full", { count: max })
    : selected
      ? t("tools.compare_remove")
      : t("tools.compare_add")

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
        aria-pressed={selected}
        className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border text-[13px] font-bold transition-colors ${
          selected ? "border-laly-teal text-laly-teal bg-laly-teal-soft" : "border-laly-line text-laly-ink bg-white hover:border-laly-teal hover:text-laly-teal"
        } ${className}`}
        data-testid="compare-button"
      >
        <CompareIcon />
        <span aria-live="polite">{full ? t("tools.compare_full", { count: max }) : selected ? t("tools.compare_added") : t("tools.compare")}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
        selected ? "bg-laly-teal-soft border-laly-teal text-laly-teal" : "bg-white border-laly-line text-laly-mut hover:text-laly-teal"
      } ${className}`}
      data-testid="compare-button"
    >
      <CompareIcon />
      {full && <span className="sr-only" aria-live="polite">{label}</span>}
    </button>
  )
}
