import { DEFAULT_LOCALE, Locale } from "@i18n/config"
import { productDetail } from "@lib/util/catalog"
import { HttpTypes } from "@medusajs/types"

const filled = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0

/**
 * The product's own text in the visitor's language. Arabic is the product's
 * title/description plus the *_ar fields of product_detail; any other
 * language shows the *_en field when it is filled, otherwise the Arabic.
 */
export function productText(product: HttpTypes.StoreProduct, locale: Locale) {
  const detail = productDetail(product)
  const english = locale !== DEFAULT_LOCALE
  const pick = (en: string | null | undefined, ar: string | null | undefined) =>
    english && filled(en) ? en : ar ?? undefined

  const highlightsAr = (detail?.highlights_ar ?? []).filter(filled)
  const highlightsEn = (detail?.highlights_en ?? []).filter(filled)

  const title = pick(detail?.title_en, product.title) ?? ""
  const description = pick(detail?.description_en, product.description) || undefined

  return {
    title,
    // A short line under the title: hidden rather than shown in Arabic on other languages' pages.
    subtitle: (english ? (filled(detail?.subtitle_en) ? detail.subtitle_en : undefined) : detail?.subtitle_ar) || undefined,
    description,
    highlights: english && highlightsEn.length ? highlightsEn : highlightsAr,
    /** Search title: the SEO title, else the product title (English first on English pages). */
    seoTitle:
      (english && (filled(detail?.seo_title_en) ? detail.seo_title_en : filled(detail?.title_en) ? detail.title_en : null)) ||
      detail?.seo_title_ar ||
      product.title ||
      "",
    /** Search description: the SEO description, else the start of the description, else the title. */
    seoDescription:
      (english &&
        (filled(detail?.seo_description_en)
          ? detail.seo_description_en
          : filled(detail?.description_en)
          ? detail.description_en.slice(0, 160)
          : null)) ||
      detail?.seo_description_ar ||
      product.description?.slice(0, 160) ||
      title,
  }
}
