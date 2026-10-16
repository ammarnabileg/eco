import { notFound } from "next/navigation"
import React, { Suspense } from "react"

import type { TrustBadge } from "@lib/data/content"
import type { Device } from "@lib/util/device"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Countdown from "@modules/laly/components/countdown"
import Icon from "@modules/laly/components/icon"
import Gallery from "@modules/products/components/gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductDetails from "@modules/products/components/product-details"
import RelatedProducts from "@modules/products/components/related-products"
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
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  device,
  badges,
  offerEndsAt,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const category = product.categories?.[0]
  const brand = (product.metadata as Record<string, unknown> | null)?.brand
  const offer = offerEndsAt ? (
    <div className="self-start">
      <Countdown endsAt={offerEndsAt} label="ينتهي العرض خلال" />
    </div>
  ) : null

  const actions = (
    <Suspense fallback={<ProductActions disabled product={product} region={region} layout={device} />}>
      <ProductActionsWrapper id={product.id} region={region} layout={device} />
    </Suspense>
  )

  const header = (
    <div className="flex flex-col gap-2">
      {typeof brand === "string" && (
        <span dir="ltr" className="self-start font-latin text-xs font-bold text-laly-teal bg-laly-teal-soft rounded-full px-3 py-1">
          {brand}
        </span>
      )}
      <h1 className="text-xl small:text-[28px] font-extrabold leading-snug" data-testid="product-title">
        {product.title}
      </h1>
      {offer}
    </div>
  )

  return (
    <div className={device === "mobile" ? "pb-28" : "pb-8"} data-testid="product-container">
      <nav aria-label="مسار التنقل" className="content-container py-4 text-xs small:text-sm text-laly-mut">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <LocalizedClientLink href="/" className="hover:text-laly-teal">الرئيسية</LocalizedClientLink>
          </li>
          {category && (
            <>
              <li aria-hidden><Icon name="chevr" size={14} className="rtl:-scale-x-100" /></li>
              <li>
                <LocalizedClientLink href={`/categories/${category.handle}`} className="hover:text-laly-teal">
                  {category.name}
                </LocalizedClientLink>
              </li>
            </>
          )}
          <li aria-hidden><Icon name="chevr" size={14} className="rtl:-scale-x-100" /></li>
          <li className="text-laly-ink font-bold line-clamp-1" aria-current="page">{product.title}</li>
        </ol>
      </nav>

      {device === "mobile" ? (
        <div className="content-container flex flex-col gap-5">
          <Gallery images={images} title={product.title} layout="mobile" />
          {header}
          {actions}
          <ProductDetails product={product} badges={badges} />
        </div>
      ) : (
        <div className="content-container grid grid-cols-[1.05fr_1fr] gap-10 items-start">
          <div className="sticky top-28">
            <Gallery images={images} title={product.title} layout="desktop" />
          </div>
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-laly-line rounded-card p-6 flex flex-col gap-6">
              {header}
              {actions}
            </div>
            <ProductDetails product={product} badges={badges} />
          </div>
        </div>
      )}

      <div className="content-container mt-12 small:mt-16" data-testid="related-products-container">
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </div>
  )
}

export default ProductTemplate
