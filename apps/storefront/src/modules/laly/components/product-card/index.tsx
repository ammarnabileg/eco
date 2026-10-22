import Image from "next/image"

import { getCardBnpl } from "@lib/data/bnpl-batch"
import { bnplOffer } from "@lib/data/bnpl-offer"
import { convertToLocale } from "@lib/util/money"
import { isPriceOnRequest } from "@lib/util/catalog"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import AddToCartButton from "@modules/laly/components/add-to-cart-button"
import Countdown from "@modules/laly/components/countdown"
import { intlLocale } from "@i18n/config"
import BnplLine from "./bnpl-line"
import { getLocale, getT } from "@i18n/server"
import ProductToolButtons from "@modules/tools/components/product-tools"

// Fields a product query must request for this card to render fully.
export const PRODUCT_CARD_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+metadata,+product_detail.*"

const isInStock = (variant?: HttpTypes.StoreProductVariant) =>
  !!variant &&
  (!variant.manage_inventory ||
    variant.allow_backorder ||
    (variant.inventory_quantity ?? 0) > 0)

export default async function ProductCard({
  product,
  priority = false,
  offerEndsAt,
}: {
  product: HttpTypes.StoreProduct
  priority?: boolean
  // End of the sale price list this product is in, for a real countdown.
  offerEndsAt?: string
}) {
  const onRequest = isPriceOnRequest(product)
  const [t, locale, bnpl] = await Promise.all([
    getT(),
    getLocale(),
    // Batched with the other cards on the page: one request per page.
    onRequest ? null : getCardBnpl(product.id),
  ])
  const { cheapestPrice } = getProductPrice({ product, locale: intlLocale(locale) })
  const instalment =
    bnpl && cheapestPrice
      ? bnplOffer(bnpl, product.id, cheapestPrice.calculated_price_number, cheapestPrice.currency_code)
      : null
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
            {inStock ? t("layout.in_stock") : t("layout.unavailable")}
          </span>
          {onSale && offerEndsAt && (
            <Countdown endsAt={offerEndsAt} variant="chip" />
          )}
          <ProductToolButtons productId={product.id} className="ms-auto" />
        </div>

        <h3 className="mt-1 text-[13.5px] small:text-sm font-bold leading-snug line-clamp-2 min-h-[2.6em]">
          <LocalizedClientLink
            href={href}
            className="hover:text-laly-teal"
            data-testid="product-title"
          >
            <bdi>{product.title}</bdi>
          </LocalizedClientLink>
        </h3>

        {onRequest ? (
          <p
            className="mt-2 text-sm font-extrabold text-laly-teal"
            data-testid="price-on-request"
          >
            {t("layout.price_on_request")}
          </p>
        ) : (
          cheapestPrice && (
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
          )
        )}
        {!onRequest && instalment && cheapestPrice && (
          <BnplLine
            gateway={instalment.gateway}
            text={t("catalog.bnpl_card", {
              count: instalment.instalments,
              amount: convertToLocale({
                amount: instalment.amount,
                currency_code: cheapestPrice.currency_code,
                locale: intlLocale(locale),
              }),
            })}
            providerLabel={t(`catalog.bnpl_with_${instalment.gateway}`)}
          />
        )}

        <div className="mt-auto pt-3">
          {onRequest ? (
            <LocalizedClientLink
              href={href}
              className="w-full h-10 rounded-btn flex items-center justify-center text-[13px] font-bold bg-laly-teal-soft text-laly-teal hover:bg-laly-teal hover:text-white transition-colors"
            >
              {t("layout.request_quote")}
            </LocalizedClientLink>
          ) : onlyVariant ? (
            <AddToCartButton
              variantId={onlyVariant.id}
              disabled={!isInStock(onlyVariant)}
            />
          ) : (
            <LocalizedClientLink
              href={href}
              className="w-full h-10 rounded-btn flex items-center justify-center text-[13px] font-bold bg-laly-teal-soft text-laly-teal hover:bg-laly-teal hover:text-white transition-colors"
            >
              {t("layout.choose_options")}
            </LocalizedClientLink>
          )}
        </div>
      </div>
    </article>
  )
}
