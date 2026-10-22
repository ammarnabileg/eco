import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getLocale, getT, languageAlternates } from "@i18n/server"
import { listBrands } from "@lib/data/catalog"
import { getRegion } from "@lib/data/regions"
import { localize } from "@lib/util/localize"
import PageBanner from "@modules/laly/components/page-banner"
import StoreTemplate from "@modules/store/templates"

type Props = { params: Promise<{ countryCode: string; handle: string }> }

const findBrand = async (handle: string) => (await listBrands()).find((b) => b.handle === handle) ?? null

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode, handle } = await params
  const [brand, t, locale] = await Promise.all([findBrand(handle), getT(), getLocale()])
  if (!brand) return { title: t("pages.brand_not_found"), robots: { index: false } }
  return {
    title: t("pages.brand_title", { brand: brand.name }),
    description: localize(brand, "description", locale) || t("pages.brand_description", { brand: brand.name }),
    alternates: await languageAlternates(countryCode),
  }
}

// A brand's products, with the same search, filters and sorting as the store.
export default async function BrandPage({ params }: Props) {
  const { countryCode, handle } = await params
  const [brand, region, t, locale] = await Promise.all([findBrand(handle), getRegion(countryCode), getT(), getLocale()])
  if (!brand || !region) notFound()

  return (
    <>
      <PageBanner
        title={brand.name}
        intro={localize(brand, "description", locale) || t("catalog.brand_intro_default", { brand: brand.name })}
        trail={[{ href: "/brands", label: t("catalog.brands") }]}
      />
      <StoreTemplate
        currencyCode={region.currency_code}
        brand={brand.name}
        header={<p className="text-[13px] text-laly-mut">{t("catalog.product_count", { count: brand.product_count ?? 0 })}</p>}
      />
    </>
  )
}
