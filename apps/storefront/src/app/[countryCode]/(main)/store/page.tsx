import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { nonEmptyCategories } from "@lib/util/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "المتجر",
  description:
    "تصفّح جميع منتجات Laly من كاميرات المراقبة والشبكات والبيت الذكي في الكويت.",
}

export default async function StorePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [region, categories] = await Promise.all([
    getRegion(countryCode),
    listCategories().catch(() => []),
  ])

  if (!region) {
    notFound()
  }

  const topLevel = nonEmptyCategories(categories).filter((c) => !c.parent_category)
  const chip =
    "h-10 px-4 shrink-0 flex items-center rounded-full border text-[13.5px] font-bold whitespace-nowrap transition-colors"

  // Desktop: a title (categories are in the filter column). Phones: the
  // category chips row from the app design.
  const header = (
    <>
      <h1
        className="hidden small:block text-[28px] font-extrabold leading-tight text-laly-ink"
        data-testid="store-page-title"
      >
        جميع المنتجات
      </h1>
      <ul className="small:hidden -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar" aria-label="الأقسام">
        <li>
          <span aria-current="page" className={`${chip} bg-laly-teal border-laly-teal text-white`}>
            كل المنتجات
          </span>
        </li>
        {topLevel.map((c) => (
          <li key={c.id}>
            <LocalizedClientLink
              href={`/categories/${c.handle}`}
              className={`${chip} bg-white border-laly-line text-laly-ink active:border-laly-teal`}
            >
              {c.name}
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </>
  )

  return <StoreTemplate currencyCode={region.currency_code} header={header} />
}
