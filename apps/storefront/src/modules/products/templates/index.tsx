import { notFound } from "next/navigation"
import React, { Suspense } from "react"

import type { TrustBadge } from "@lib/data/content"
import { productBrand, productDetail, SpecGroup } from "@lib/util/catalog"
import type { Device } from "@lib/util/device"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Countdown from "@modules/laly/components/countdown"
import Icon from "@modules/laly/components/icon"
import Gallery from "@modules/products/components/gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductDetails from "@modules/products/components/product-details"
import ProductJsonLd from "@modules/products/components/product-json-ld"
import RelatedProducts from "@modules/products/components/related-products"
import TrackViewed from "@modules/products/components/track-viewed"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  device: Device
  badges: TrustBadge[]
  offerEndsAt?: string
  specGroups?: SpecGroup[]
  whatsapp?: string | null
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  device,
  badges,
  offerEndsAt,
  specGroups = [],
  whatsapp,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const category = product.categories?.[0]
  const detail = productDetail(product)
  const brand =
    productBrand(product)?.name ??
    (product.metadata as Record<string, unknown> | null)?.brand
  const highlights = detail?.highlights_ar?.filter(Boolean) ?? []
  const offer = offerEndsAt ? (
    <div className="self-start">
      <Countdown endsAt={offerEndsAt} label="ينتهي العرض خلال" />
    </div>
  ) : null

  const actions = (
    <Suspense
      fallback={
        <ProductActions
          disabled
          product={product}
          region={region}
          layout={device}
          whatsapp={whatsapp}
        />
      }
    >
      <ProductActionsWrapper
        id={product.id}
        region={region}
        layout={device}
        whatsapp={whatsapp}
      />
    </Suspense>
  )

  const header = (
    <div className="flex flex-col gap-2">
      {(typeof brand === "string" || detail?.mpn) && (
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {typeof brand === "string" && (
            <span
              dir="ltr"
              className="font-latin font-bold text-laly-teal bg-laly-teal-soft rounded-full px-3 py-1"
              data-testid="product-brand"
            >
              {brand}
            </span>
          )}
          {detail?.mpn && (
            <span className="text-laly-mut">
              رقم الموديل:{" "}
              <span
                dir="ltr"
                className="font-latin font-bold text-laly-ink select-all"
                data-testid="product-mpn"
              >
                {detail.mpn}
              </span>
            </span>
          )}
        </div>
      )}
      <h1
        className="text-xl small:text-[28px] font-extrabold leading-snug"
        data-testid="product-title"
      >
        {product.title}
      </h1>
      {detail?.subtitle_ar && (
        <p className="text-sm text-laly-mut">{detail.subtitle_ar}</p>
      )}
      {highlights.length > 0 && (
        <ul
          className="mt-1 grid gap-1.5 text-sm"
          data-testid="product-highlights"
        >
          {highlights.map((h) => (
            <li key={h} className="flex items-start gap-2">
              <Icon
                name="check"
                size={16}
                className="mt-0.5 shrink-0 text-laly-teal"
              />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}
      {offer}
    </div>
  )

  return (
    <div
      className={device === "mobile" ? "pb-28" : "pb-8"}
      data-testid="product-container"
    >
      <ProductJsonLd product={product} countryCode={countryCode} />
      <TrackViewed productId={product.id} />
      <nav
        aria-label="مسار التنقل"
        className="content-container py-4 text-xs small:text-sm text-laly-mut"
      >
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <LocalizedClientLink href="/" className="hover:text-laly-teal">
              الرئيسية
            </LocalizedClientLink>
          </li>
          {category && (
            <>
              <li aria-hidden>
                <Icon name="chevr" size={14} className="rtl:-scale-x-100" />
              </li>
              <li>
                <LocalizedClientLink
                  href={`/categories/${category.handle}`}
                  className="hover:text-laly-teal"
                >
                  {category.name}
                </LocalizedClientLink>
              </li>
            </>
          )}
          <li aria-hidden>
            <Icon name="chevr" size={14} className="rtl:-scale-x-100" />
          </li>
          <li
            className="text-laly-ink font-bold line-clamp-1"
            aria-current="page"
          >
            {product.title}
          </li>
        </ol>
      </nav>

      {device === "mobile" ? (
        <div className="content-container flex flex-col gap-5">
          <Gallery images={images} title={product.title} layout="mobile" />
          {header}
          {actions}
          <ProductDetails
            product={product}
            badges={badges}
            specGroups={specGroups}
          />
        </div>
      ) : (
        <div className="content-container grid grid-cols-1 small:grid-cols-[1.05fr_1fr] gap-6 small:gap-10 items-start">
          <div className="sticky top-28">
            <Gallery images={images} title={product.title} layout="desktop" />
          </div>
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-laly-line rounded-card p-6 flex flex-col gap-6">
              {header}
              {actions}
            </div>
            <ProductDetails
              product={product}
              badges={badges}
              specGroups={specGroups}
            />
          </div>
        </div>
      )}

      <div
        className="content-container mt-12 small:mt-16"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </div>
  )
}

export default ProductTemplate
