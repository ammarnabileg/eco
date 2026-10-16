import Image from "next/image"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import AddToCartButton from "@modules/laly/components/add-to-cart-button"
import Countdown from "@modules/laly/components/countdown"

// Fields a product query must request for this card to render fully.
export const PRODUCT_CARD_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+metadata"

const isInStock = (variant?: HttpTypes.StoreProductVariant) =>
  !!variant &&
  (!variant.manage_inventory ||
    variant.allow_backorder ||
    (variant.inventory_quantity ?? 0) > 0)

export default function ProductCard({
  product,
  priority = false,
  offerEndsAt,
}: {
  product: HttpTypes.StoreProduct
  priority?: boolean
  // End of the sale price list this product is in, for a real countdown.
  offerEndsAt?: string
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const variants = product.variants ?? []
  const onlyVariant = variants.length === 1 ? variants[0] : undefined
  const inStock = variants.some(isInStock)
  const onSale = cheapestPrice?.price_type === "sale"
  const image = product.thumbnail || product.images?.[0]?.url
  const href = `/products/${product.handle}`

  return (
    <article
      className="group h-full flex flex-col bg-white border border-laly-line rounded-card p-3 small:p-3.5 transition-shadow hover:shadow-laly"
      data-testid="product-wrapper"
    >
      <LocalizedClientLink
        href={href}
        className="relative block aspect-[4/3] rounded-[13px] bg-laly-bg overflow-hidden"
        tabIndex={-1}
        aria-hidden="true"
      >
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 1024px) 50vw, 280px"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <PlaceholderImage size={24} />
          </span>
        )}
        <span className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1.5">
          {onSale && cheapestPrice?.percentage_diff && (
            <span
              dir="ltr"
              className="rounded-full bg-laly-red text-white text-[11px] font-extrabold px-2 py-0.5"
            >
              -{cheapestPrice.percentage_diff}%
            </span>
          )}
        </span>
      </LocalizedClientLink>

      <div className="flex flex-col flex-1 pt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`flex items-center gap-1 text-[11.5px] font-bold ${
            inStock ? "text-laly-green" : "text-laly-faint"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              inStock ? "bg-laly-green" : "bg-laly-faint"
            }`}
          />
          {inStock ? "متوفر" : "غير متوفر"}
        </span>
        {onSale && offerEndsAt && <Countdown endsAt={offerEndsAt} variant="chip" />}
        </div>

        <h3 className="mt-1 text-[13.5px] small:text-sm font-bold leading-snug line-clamp-2 min-h-[2.6em]">
          <LocalizedClientLink
            href={href}
            className="hover:text-laly-teal"
            data-testid="product-title"
          >
            {product.title}
          </LocalizedClientLink>
        </h3>

        {cheapestPrice && (
          <div className="mt-2 flex items-baseline flex-wrap gap-x-2">
            <span
              className="text-base small:text-[17px] font-extrabold text-laly-ink"
              data-testid="price"
            >
              {cheapestPrice.calculated_price}
            </span>
            {onSale && (
              <span
                className="text-xs text-laly-faint line-through"
                data-testid="original-price"
              >
                {cheapestPrice.original_price}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3">
          {onlyVariant ? (
            <AddToCartButton
              variantId={onlyVariant.id}
              disabled={!isInStock(onlyVariant)}
            />
          ) : (
            <LocalizedClientLink
              href={href}
              className="w-full h-10 rounded-btn flex items-center justify-center text-[13px] font-bold bg-laly-teal-soft text-laly-teal hover:bg-laly-teal hover:text-white transition-colors"
            >
              اختر المواصفات
            </LocalizedClientLink>
          )}
        </div>
      </div>
    </article>
  )
}
