import { notFound } from "next/navigation"

import { getLocale, getT } from "@i18n/server"
import { categoryDescription, categoryName } from "@lib/util/category-name"


import type { SpecAttribute } from "@lib/util/catalog"
import { categoryTreeIds } from "@lib/util/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import StoreTemplate from "@modules/store/templates"
import { HttpTypes } from "@medusajs/types"

export default async function CategoryTemplate({
  category,
  countryCode,
  currencyCode,
  attributes,
  childrenWithProducts,
}: {
  category: HttpTypes.StoreProductCategory
  countryCode: string
  currencyCode: string
  attributes: SpecAttribute[]
  /** Sub-categories that hold products, directly or below them. */
  childrenWithProducts: string[]
}) {
  if (!category || !countryCode) notFound()

  const [t, locale] = await Promise.all([getT(), getLocale()])
  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  // Root first, so the trail reads from the top-level category down.
  const trail = [...parents].reverse()

  // Sub-categories without products are hidden until they get some.
  const children = (category.category_children ?? []).filter((c) =>
    childrenWithProducts.includes(c.id)
  )

  const header = (
    <>
      {trail.length > 0 && (
        <nav
          aria-label={t("catalog.breadcrumb")}
          className="mb-2 flex flex-wrap items-center gap-x-2 text-[13px] text-laly-mut"
        >
          {trail.map((parent) => (
            <span key={parent.id} className="flex items-center gap-x-2">
              <LocalizedClientLink
                className="hover:text-laly-teal"
                href={`/categories/${parent.handle}`}
                data-testid="sort-by-link"
              >
                {categoryName(parent, locale)}
              </LocalizedClientLink>
              <span aria-hidden="true" className="text-laly-faint">
                /
              </span>
            </span>
          ))}
        </nav>
      )}
      <h1
        className="mb-4 text-xl small:text-[28px] font-extrabold leading-tight text-laly-ink"
        data-testid="category-page-title"
      >
        {categoryName(category, locale)}
      </h1>
      {categoryDescription(category, locale) && (
        <p className="mb-6 text-sm text-laly-mut leading-relaxed">
          {categoryDescription(category, locale)}
        </p>
      )}
      {children.length > 0 && (
        <ul className="-mx-4 px-4 small:mx-0 small:px-0 flex gap-2 overflow-x-auto no-scrollbar small:flex-wrap">
          {children.map((c) => (
            <li key={c.id}>
              <LocalizedClientLink
                href={`/categories/${c.handle}`}
                className="h-9 px-4 shrink-0 whitespace-nowrap flex items-center rounded-full bg-white border border-laly-line text-[13px] font-bold text-laly-ink hover:border-laly-teal hover:text-laly-teal transition-colors"
              >
                {categoryName(c, locale)}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      )}
    </>
  )

  return (
    <StoreTemplate
      currencyCode={currencyCode}
      categoryIds={categoryTreeIds(category)}
      attributes={attributes}
      header={header}
    />
  )
}
