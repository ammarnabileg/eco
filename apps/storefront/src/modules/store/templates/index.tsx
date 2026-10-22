"use client"

import type { SearchClient } from "instantsearch.js"
import { ReactNode, useMemo } from "react"
import { Configure, InstantSearch } from "react-instantsearch"

import type { SpecAttribute } from "@lib/util/catalog"
import {
  makeSearchClient,
  PRODUCT_INDEX_NAME,
  searchClient,
} from "@lib/search-client"
import StoreHits from "@modules/store/components/store-hits"
import StoreRefinements from "@modules/store/components/store-refinements"
import StoreSearchBox from "@modules/store/components/store-search-box"

const PRODUCT_LIMIT = 12

/**
 * The searchable product listing. With `categoryIds` it becomes a category
 * page: results and facet counts are limited to that part of the tree and
 * the category's spec filters are shown.
 */
const StoreTemplate = ({
  currencyCode,
  categoryIds,
  attributes = [],
  header,
}: {
  currencyCode: string
  categoryIds?: string[]
  attributes?: SpecAttribute[]
  header?: ReactNode
}) => {
  const scope = categoryIds?.join(",")
  const client = useMemo(
    () =>
      scope
        ? makeSearchClient({ category_ids: { $in: scope.split(",") } })
        : searchClient,
    [scope]
  )

  return (
    <div className="py-6 content-container" data-testid="category-container">
      <div className="mb-4 small:mb-8">
        {header ?? (
          <h1
            className="text-xl small:text-[28px] font-extrabold leading-tight text-laly-ink"
            data-testid="store-page-title"
          >
            جميع المنتجات
          </h1>
        )}
      </div>

      <div className="flex flex-col small:flex-row small:items-start">
        <InstantSearch
          indexName={PRODUCT_INDEX_NAME}
          searchClient={client as unknown as SearchClient}
          routing
          future={{ preserveSharedStateOnUnmount: true }}
        >
          <Configure hitsPerPage={PRODUCT_LIMIT} />
          <StoreRefinements
            currencyCode={currencyCode}
            attributes={attributes}
            showCategories={!categoryIds}
          />
          <div className="w-full min-w-0">
            <StoreSearchBox />
            <StoreHits
              hitsPerPage={PRODUCT_LIMIT}
              currencyCode={currencyCode}
            />
          </div>
        </InstantSearch>
      </div>
    </div>
  )
}

export default StoreTemplate
