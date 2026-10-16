import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { OptionValueIds } from "@lib/util/product-option-filters"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  optionValueIds,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

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

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList
        sortBy={sort}
        data-testid="sort-by-container"
        hideOptionsPicker
      />
      <div className="w-full min-w-0">
        {trail.length > 0 && (
          <nav
            aria-label="مسار التصفح"
            className="mb-2 flex flex-wrap items-center gap-x-2 text-[13px] text-laly-mut"
          >
            {trail.map((parent) => (
              <span key={parent.id} className="flex items-center gap-x-2">
                <LocalizedClientLink
                  className="hover:text-laly-teal"
                  href={`/categories/${parent.handle}`}
                  data-testid="sort-by-link"
                >
                  {parent.name}
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
          {category.name}
        </h1>
        {category.description && (
          <p className="mb-6 text-sm text-laly-mut leading-relaxed">
            {category.description}
          </p>
        )}
        {!!category.category_children?.length && (
          <ul className="mb-6 flex flex-wrap gap-2">
            {category.category_children.map((c) => (
              <li key={c.id}>
                <LocalizedClientLink
                  href={`/categories/${c.handle}`}
                  className="h-9 px-4 flex items-center rounded-full bg-white border border-laly-line text-[13px] font-bold text-laly-ink hover:border-laly-teal hover:text-laly-teal transition-colors"
                >
                  {c.name}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        )}
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
          />
        </Suspense>
      </div>
    </div>
  )
}
