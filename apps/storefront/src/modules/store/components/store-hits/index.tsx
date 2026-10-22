"use client"

import type { Hit } from "instantsearch.js"
import { useEffect, useRef, useState } from "react"
import { useHits, useInstantSearch } from "react-instantsearch"

import { intlLocale } from "@i18n/config"
import { useLocale, useT } from "@i18n/client"
import { getListingBnpl } from "@lib/data/bnpl"
import { BnplListing, EMPTY_BNPL_LISTING, bnplOffer } from "@lib/data/bnpl-offer"
import { convertToLocale } from "@lib/util/money"
import BnplLine from "@modules/laly/components/product-card/bnpl-line"
import useSearchSettled from "@lib/hooks/use-search-settled"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import Image from "next/image"
import SearchPagination from "./pagination"
import HitPrice, { HitPricing, getHitPricing } from "./price"

type ProductHit = Hit<
  {
    title: string | null
    handle: string | null
    thumbnail: string | null
    brand?: string | null
    price_on_request?: boolean | null
  } & HitPricing
>

type StoreHitsProps = {
  hitsPerPage: number
  currencyCode: string
}

const HitCard = ({
  hit,
  currencyCode,
  priority,
  bnpl,
}: {
  hit: ProductHit
  currencyCode: string
  priority: boolean
  bnpl: BnplListing
}) => {
  const t = useT()
  const locale = intlLocale(useLocale())
  const href = `/products/${hit.handle}`
  const pricing = hit.price_on_request ? null : getHitPricing(hit, currencyCode)
  const discount = pricing?.discount
  // A price range has no single instalment amount: no line then.
  const instalment =
    pricing && !pricing.isRange
      ? bnplOffer(bnpl, hit.objectID, pricing.min_price, currencyCode)
      : null

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
        {hit.thumbnail ? (
          <Image
            src={hit.thumbnail}
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
        {discount && (
          <span
            dir="ltr"
            className="absolute top-2.5 start-2.5 rounded-full bg-laly-red text-white text-[11px] font-extrabold px-2 py-0.5"
          >
            -{discount}%
          </span>
        )}
      </LocalizedClientLink>

      <div className="flex flex-col flex-1 pt-3">
        {hit.brand && (
          <span
            dir="ltr"
            className="self-start mb-1 font-latin text-[11px] font-bold text-laly-teal"
          >
            {hit.brand}
          </span>
        )}
        <h3 className="text-[13.5px] small:text-sm font-bold leading-snug line-clamp-2 min-h-[2.6em]">
          <LocalizedClientLink
            href={href}
            className="hover:text-laly-teal"
            data-testid="product-title"
          >
            <bdi>{hit.title}</bdi>
          </LocalizedClientLink>
        </h3>
        <div className="mt-auto pt-2">
          {hit.price_on_request ? (
            <p
              className="text-sm font-extrabold text-laly-teal"
              data-testid="price-on-request"
            >
              {t("catalog.price_on_request")}
            </p>
          ) : (
            <HitPrice hit={hit} currencyCode={currencyCode} />
          )}
          {instalment && pricing && (
            <BnplLine
              gateway={instalment.gateway}
              text={t("catalog.bnpl_card", {
                count: instalment.instalments,
                amount: convertToLocale({
                  amount: instalment.amount,
                  currency_code: pricing.currency_code,
                  locale,
                }),
              })}
              providerLabel={t(`catalog.bnpl_with_${instalment.gateway}`)}
            />
          )}
        </div>
      </div>
    </article>
  )
}

const StoreHits = ({ hitsPerPage, currencyCode }: StoreHitsProps) => {
  const t = useT()
  const { items } = useHits<ProductHit>()
  const { status, error, indexUiState } = useInstantSearch()
  const { isSearching, hasNoResultsYet } = useSearchSettled()

  const { page, ...refinements } = indexUiState
  const currentPage = page ?? 1
  const refinementKey = JSON.stringify(refinements)

  const settled = useRef({ page: currentPage, refinementKey })

  useEffect(() => {
    if (!isSearching) {
      settled.current = { page: currentPage, refinementKey }
    }
  }, [isSearching, currentPage, refinementKey])

  const isPagingOnly =
    refinementKey === settled.current.refinementKey &&
    currentPage !== settled.current.page

  const showSkeleton = hasNoResultsYet || (isSearching && isPagingOnly)

  // Instalment eligibility for the whole page of hits in one request,
  // refreshed when the page of results changes.
  const pageIds = items
    .filter((h) => h.handle && !h.price_on_request)
    .map((h) => h.objectID)
    .join(",")
  const [bnpl, setBnpl] = useState<BnplListing>(EMPTY_BNPL_LISTING)
  useEffect(() => {
    if (!pageIds) return
    let current = true
    getListingBnpl(pageIds.split(","))
      .then((listing) => current && setBnpl(listing))
      .catch(() => undefined)
    return () => {
      current = false
    }
  }, [pageIds])

  if (status === "error") {
    return (
      <p
        className="py-16 text-center text-sm font-bold text-laly-red"
        data-testid="products-error"
      >
        {t("catalog.load_error")}
        {error?.message ? (
          <>
            {": "}
            <span dir="ltr">{error.message}</span>
          </>
        ) : (
          "."
        )}
      </p>
    )
  }

  return (
    <>
      {showSkeleton ? (
        <SkeletonProductGrid numberOfProducts={hitsPerPage} />
      ) : !items.length ? (
        <div
          className="py-16 px-4 text-center bg-white border border-laly-line rounded-card"
          data-testid="no-products"
        >
          <p className="text-base font-extrabold text-laly-ink">
            {t("catalog.no_matches")}
          </p>
          <p className="mt-1 text-sm text-laly-mut">
            {t("catalog.no_matches_hint")}
          </p>
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-3 small:gap-4"
          data-testid="products-list"
        >
          {items.map((hit, index) =>
            hit.handle ? (
              <li key={hit.objectID}>
                <HitCard
                  hit={hit}
                  currencyCode={currencyCode}
                  priority={index < 4}
                  bnpl={bnpl}
                />
              </li>
            ) : null
          )}
        </ul>
      )}
      <SearchPagination />
    </>
  )
}

export default StoreHits
