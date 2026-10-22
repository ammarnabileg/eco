import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listBrands } from "@lib/data/catalog"
import { getRegion } from "@lib/data/regions"
import PageBanner from "@modules/laly/components/page-banner"
import StoreTemplate from "@modules/store/templates"

type Props = { params: Promise<{ countryCode: string; handle: string }> }

const findBrand = async (handle: string) => (await listBrands()).find((b) => b.handle === handle) ?? null

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode, handle } = await params
  const brand = await findBrand(handle)
  if (!brand) return { title: "الماركة غير موجودة", robots: { index: false } }
  return {
    title: `منتجات ${brand.name}`,
    description: brand.description_ar || `كل منتجات ${brand.name} المتوفرة في Laly بالكويت.`,
    alternates: { canonical: `/${countryCode}/brands/${handle}` },
  }
}

// A brand's products, with the same search, filters and sorting as the store.
export default async function BrandPage({ params }: Props) {
  const { countryCode, handle } = await params
  const [brand, region] = await Promise.all([findBrand(handle), getRegion(countryCode)])
  if (!brand || !region) notFound()

  return (
    <>
      <PageBanner
        title={brand.name}
        intro={brand.description_ar || `كل منتجات ${brand.name} المتوفرة عندنا.`}
        trail={[{ href: "/brands", label: "الماركات" }]}
      />
      <StoreTemplate
        currencyCode={region.currency_code}
        brand={brand.name}
        header={<p className="text-[13px] text-laly-mut">{brand.product_count} منتج</p>}
      />
    </>
  )
}
