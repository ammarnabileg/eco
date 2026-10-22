import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { getLocale, getT } from "@i18n/server"
import { categoryName } from "@lib/util/category-name"

import { nonEmptyCategories } from "@lib/util/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import StoreTemplate from "@modules/store/templates"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: t("pages.store_title"),
    description: t("pages.store_description"),
  }
}

export default async function StorePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [region, categories, t] = await Promise.all([
    getRegion(countryCode),
    listCategories().catch(() => []),
    getT(),
  ])
  const locale = await getLocale()

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
        {t("catalog.all_products")}
      </h1>
      <ul className="small:hidden -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar" aria-label={t("catalog.categories")}>
        <li>
          <span aria-current="page" className={`${chip} bg-laly-teal border-laly-teal text-white`}>
            {t("catalog.all_products_chip")}
          </span>
        </li>
        {topLevel.map((c) => (
          <li key={c.id}>
            <LocalizedClientLink
              href={`/categories/${c.handle}`}
              className={`${chip} bg-white border-laly-line text-laly-ink active:border-laly-teal`}
            >
              {categoryName(c, locale)}
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </>
  )

  return <StoreTemplate currencyCode={region.currency_code} header={header} />
}
