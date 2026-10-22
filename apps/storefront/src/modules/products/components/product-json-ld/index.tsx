import { HttpTypes } from "@medusajs/types"

import { DEFAULT_LOCALE, intlLocale, localePath } from "@i18n/config"
import { getLocale, getT } from "@i18n/server"
import { categoryName } from "@lib/util/category-name"
import {
  isPriceOnRequest,
  productBrand,
  productDetail,
} from "@lib/util/catalog"
import { getBaseURL } from "@lib/util/env"
import { getProductPrice } from "@lib/util/get-product-price"
import { localize } from "@lib/util/localize"
import { productText } from "@modules/products/lib/product-text"

const isInStock = (v: HttpTypes.StoreProductVariant) =>
  !v.manage_inventory || v.allow_backorder || (v.inventory_quantity ?? 0) > 0

/**
 * Product, FAQPage and BreadcrumbList structured data for search engines and
 * AI answer engines. Price-on-request products carry no offer.
 */
export default async function ProductJsonLd({
  product,
  countryCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
}) {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  const text = productText(product, locale)
  const english = locale !== DEFAULT_LOCALE
  // Addresses and text in the page's language.
  const base = `${getBaseURL()}${localePath(countryCode, locale)}`
  const url = `${base}/products/${product.handle}`
  const detail = productDetail(product)
  const brand = productBrand(product)
  const { cheapestPrice } = getProductPrice({
    product,
    locale: intlLocale(locale),
  })
  const variants = product.variants ?? []
  const sku = variants.length === 1 ? variants[0].sku : undefined

  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: text.title,
    description:
      (english &&
        (detail?.seo_description_en?.trim() ||
          detail?.description_en?.trim())) ||
      detail?.seo_description_ar ||
      product.description ||
      undefined,
    image: [
      product.thumbnail,
      ...(product.images ?? []).map((i) => i.url),
    ].filter((u, i, all): u is string => !!u && all.indexOf(u) === i),
    url,
    sku: sku || undefined,
    mpn: detail?.mpn || undefined,
    brand: brand?.name ? { "@type": "Brand", name: brand.name } : undefined,
    category: product.categories?.[0]?.name,
  }

  if (!isPriceOnRequest(product) && cheapestPrice) {
    productLd.offers = {
      "@type": "Offer",
      url,
      priceCurrency: cheapestPrice.currency_code.toUpperCase(),
      price: cheapestPrice.calculated_price_number.toFixed(3),
      availability: variants.some(isInStock)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    }
  }

  const blocks: Record<string, unknown>[] = [productLd]

  if (detail?.faq?.length) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: detail.faq.map((f) => ({
        "@type": "Question",
        name: localize(f, "question", locale),
        acceptedAnswer: {
          "@type": "Answer",
          text: localize(f, "answer", locale),
        },
      })),
    })
  }

  // Root first: the product's first category and its ancestors.
  const trail: { name: string; handle: string }[] = []
  for (
    let c = product.categories?.[0] as
      | HttpTypes.StoreProductCategory
      | null
      | undefined;
    c && trail.length < 5;
    c = c.parent_category
  ) {
    trail.unshift({ name: categoryName(c, locale), handle: c.handle })
  }
  blocks.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: t("product.home"), item: base },
      ...trail.map((c) => ({
        name: c.name,
        item: `${base}/categories/${c.handle}`,
      })),
      { name: text.title, item: url },
    ].map((entry, i) => ({ "@type": "ListItem", position: i + 1, ...entry })),
  })

  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify output with "<" escaped cannot close the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  )
}
