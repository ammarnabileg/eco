"use client"

import { XMarkMini } from "@medusajs/icons"
import { useClearRefinements, useCurrentRefinements } from "react-instantsearch"

import { indexedCurrency, priceAttribute } from "@lib/search-client"
import { convertToLocale } from "@lib/util/money"
import FilterCard from "@modules/store/components/filter-card"
import {
  CATEGORY_ATTRIBUTE,
  LABELS_ATTRIBUTE,
  OPTION_VALUES_ATTRIBUTE,
} from "./attributes"

type Refinement = ReturnType<
  typeof useCurrentRefinements
>["items"][number]["refinements"][number]

/**
 * What a single refinement reads as on its chip. The raw label is the facet
 * value, which is the option's `Size:M` form for options and a bare `true` for
 * the on-sale toggle — neither says what it filters on out of context.
 */
function refinementLabel(refinement: Refinement, currencyCode: string) {
  const { attribute, label, value, operator } = refinement

  if (attribute === OPTION_VALUES_ATTRIBUTE) {
    const separator = String(value).indexOf(":")

    return separator < 1
      ? label
      : `${String(value).slice(0, separator)}: ${String(value).slice(
          separator + 1
        )}`
  }

  if (attribute === priceAttribute("on_sale", currencyCode)) {
    return "عروض"
  }

  if (attribute === priceAttribute("min_price", currencyCode)) {
    const amount = convertToLocale({
      amount: Number(value),
      currency_code: indexedCurrency(currencyCode),
      maximumFractionDigits: 0,
    })

    return operator === "<=" || operator === "<"
      ? `حتى ${amount}`
      : `من ${amount}`
  }

  if (attribute === CATEGORY_ATTRIBUTE) {
    return `الفئة: ${label}`
  }

  if (attribute === LABELS_ATTRIBUTE) {
    return `الوسم: ${label}`
  }

  return label
}

/**
 * Every active refinement as a chip that drops it, above the filters that set
 * them. The free-text query is excluded by the connector's own defaults, so
 * only what the sidebar controls shows up here.
 */
const CurrentRefinements = ({ currencyCode }: { currencyCode: string }) => {
  const { items, refine } = useCurrentRefinements()
  const { canRefine: canClearAll, refine: clearAll } = useClearRefinements()

  const refinements = items.flatMap((item) => item.refinements)

  if (!refinements.length) {
    return null
  }

  return (
    <FilterCard data-testid="current-refinements">
      <div className="mb-3 flex items-center justify-between gap-x-2">
        <h2 className="text-sm font-extrabold text-laly-ink">
          الفلاتر المطبّقة
        </h2>
        {canClearAll && (
          <button
            onClick={clearAll}
            className="text-[13px] font-bold text-laly-teal hover:text-laly-teal-d"
            data-testid="clear-refinements"
          >
            مسح الكل
          </button>
        )}
      </div>

      <ul className="flex flex-wrap gap-2">
        {refinements.map((refinement) => {
          const label = refinementLabel(refinement, currencyCode)

          return (
            <li
              key={`${refinement.attribute}:${refinement.operator ?? ""}:${
                refinement.value
              }`}
            >
              <button
                onClick={() => refine(refinement)}
                aria-label={`إزالة الفلتر ${label}`}
                className="h-8 rounded-full bg-laly-teal-soft text-laly-teal text-xs font-bold px-3 flex items-center gap-x-1.5 transition-colors duration-150 hover:bg-laly-teal hover:text-white"
                data-testid="remove-refinement"
              >
                {label}
                <XMarkMini />
              </button>
            </li>
          )
        })}
      </ul>
    </FilterCard>
  )
}

export default CurrentRefinements
