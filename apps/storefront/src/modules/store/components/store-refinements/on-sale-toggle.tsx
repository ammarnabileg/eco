"use client"

import { useToggleRefinement } from "react-instantsearch"

import { priceAttribute } from "@lib/search-client"

/**
 * Narrows to products whose calculated price is below their original in the
 * region's currency. Hides itself when nothing is discounted, which is the
 * case until a price list applies to some product.
 */
const OnSaleToggle = ({ currencyCode }: { currencyCode: string }) => {
  const { value, refine, canRefine } = useToggleRefinement({
    attribute: priceAttribute("on_sale", currencyCode),
    on: true,
  })

  if (!canRefine) {
    return null
  }

  return (
    <label className="flex cursor-pointer items-center gap-x-2.5 bg-white border border-laly-line rounded-card p-4">
      <input
        type="checkbox"
        checked={value.isRefined}
        onChange={() => refine(value)}
        className="w-4 h-4 shrink-0 accent-laly-teal"
        data-testid="on-sale-toggle"
      />
      <span className="text-sm font-extrabold text-laly-ink">
        العروض فقط
      </span>
      {typeof value.count === "number" && (
        <span className="text-xs text-laly-faint">
          ({value.count})
        </span>
      )}
    </label>
  )
}

export default OnSaleToggle
