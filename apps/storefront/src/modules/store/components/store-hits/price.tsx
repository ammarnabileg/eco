"use client"

import { intlLocale } from "@i18n/config"
import { useLocale } from "@i18n/client"
import { indexedCurrency, priceAttribute } from "@lib/search-client"
import { getPercentageDiff } from "@lib/util/get-percentage-diff"
import { convertToLocale } from "@lib/util/money"

/** The per-currency price fields a hit may carry, e.g. `min_price_eur`. */
export type HitPricing = Record<string, unknown>

const amount = (value: unknown) => (typeof value === "number" ? value : null)

/**
 * Reads a hit's indexed prices for the region's currency. `discount` is the
 * whole-number percentage off, set only for a single-price hit on sale.
 */
export const getHitPricing = (hit: HitPricing, currencyCode: string) => {
  const currency_code = indexedCurrency(currencyCode)
  const min_price = amount(hit[priceAttribute("min_price", currencyCode)])
  const max_price = amount(hit[priceAttribute("max_price", currencyCode)])
  const original_price = amount(
    hit[priceAttribute("original_price", currencyCode)]
  )
  const on_sale = hit[priceAttribute("on_sale", currencyCode)] === true

  if (min_price === null) {
    return null
  }

  const max = max_price ?? min_price
  const isRange = max > min_price
  const showOriginal =
    !isRange && on_sale && original_price !== null && original_price > min_price

  return {
    currency_code,
    min_price,
    max,
    isRange,
    on_sale,
    original_price: showOriginal ? original_price : null,
    discount:
      showOriginal && original_price !== null
        ? getPercentageDiff(original_price, min_price)
        : null,
  }
}

type HitPriceProps = {
  hit: HitPricing
  currencyCode: string
}

const HitPrice = ({ hit, currencyCode }: HitPriceProps) => {
  const locale = intlLocale(useLocale())
  const pricing = getHitPricing(hit, currencyCode)

  if (!pricing) {
    return null
  }

  const format = (value: number) =>
    convertToLocale({ amount: value, currency_code: pricing.currency_code, locale })

  return (
    <div
      className="flex items-baseline flex-wrap gap-x-2"
      data-testid="product-price"
    >
      <span
        className="text-base small:text-[17px] font-extrabold text-laly-ink"
        data-testid="price"
      >
        {pricing.isRange
          ? `${format(pricing.min_price)} - ${format(pricing.max)}`
          : format(pricing.min_price)}
      </span>
      {pricing.original_price !== null && (
        <span
          className="text-xs text-laly-faint line-through"
          data-testid="original-price"
        >
          {format(pricing.original_price)}
        </span>
      )}
    </div>
  )
}

export default HitPrice
