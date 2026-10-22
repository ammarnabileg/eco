"use client"

import { useLocale, useT } from "@i18n/client"
import { intlLocale } from "@i18n/config"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
  size = "large",
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  size?: "large" | "compact"
}) {
  const t = useT()
  const locale = intlLocale(useLocale())
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
    locale,
  })

  const price = variant ? variantPrice : cheapestPrice

  if (!price) {
    return <div className="block w-32 h-9 bg-laly-line rounded animate-pulse" />
  }

  const onSale = price.price_type === "sale"

  return (
    <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1">
      {!variant && (product.variants?.length ?? 0) > 1 && (
        <span className="text-sm text-laly-mut">{t("product.price_from")}</span>
      )}
      <span
        className={size === "large" ? "text-[28px] font-extrabold" : "text-lg font-extrabold"}
        data-testid="product-price"
        data-value={price.calculated_price_number}
      >
        {price.calculated_price}
      </span>
      {onSale && (
        <>
          <span
            className="text-sm text-laly-faint line-through"
            data-testid="original-product-price"
            data-value={price.original_price_number}
          >
            {price.original_price}
          </span>
          {size === "large" && (
            <span dir="ltr" className="rounded-full bg-laly-red text-white text-xs font-extrabold px-2 py-0.5">
              -{price.percentage_diff}%
            </span>
          )}
        </>
      )}
    </div>
  )
}
