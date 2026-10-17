"use client"

import { useState } from "react"
import { useCurrentRefinements, useSortBy } from "react-instantsearch"

import type { SpecAttribute } from "@lib/util/catalog"
import Icon from "@modules/laly/components/icon"
import Sheet from "@modules/laly/components/sheet"

import {
  BRAND_ATTRIBUTE,
  CATEGORY_ATTRIBUTE,
  LABELS_ATTRIBUTE,
  getSortOptions,
} from "./attributes"
import CurrentRefinements from "./current-refinements"
import OnSaleToggle from "./on-sale-toggle"
import OptionRefinements from "./option-refinements"
import PriceRange from "./price-range"
import RefinementGroup from "./refinement-group"
import SpecRefinements from "./spec-refinements"
import SortRadioGroup from "@modules/store/components/sort-radio-group"

const SortProducts = ({ currencyCode }: { currencyCode: string }) => {
  const items = getSortOptions(currencyCode)
  const { currentRefinement, refine } = useSortBy({ items })

  return (
    <SortRadioGroup
      title="ترتيب حسب"
      items={items}
      value={currentRefinement}
      handleChange={refine}
      data-testid="sort-by-container"
    />
  )
}

const Filters = ({
  currencyCode,
  attributes,
  showCategories,
}: {
  currencyCode: string
  attributes: SpecAttribute[]
  showCategories: boolean
}) => (
  <>
    <CurrentRefinements currencyCode={currencyCode} />
    <RefinementGroup attribute={BRAND_ATTRIBUTE} title="الماركة" />
    <SpecRefinements attributes={attributes} />
    <OptionRefinements />
    <PriceRange currencyCode={currencyCode} />
    <OnSaleToggle currencyCode={currencyCode} />
    {showCategories && (
      <RefinementGroup attribute={CATEGORY_ATTRIBUTE} title="الفئة" />
    )}
    <RefinementGroup attribute={LABELS_ATTRIBUTE} title="الوسوم" />
  </>
)

/**
 * Sidebar on desktop; on phones a "filters" button opens the same filters
 * in a bottom sheet so the products stay first on screen.
 */
const StoreRefinements = ({
  currencyCode,
  attributes = [],
  showCategories = true,
}: {
  currencyCode: string
  attributes?: SpecAttribute[]
  showCategories?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const { items } = useCurrentRefinements()
  const active = items.reduce((n, i) => n + i.refinements.length, 0)

  return (
    <>
      <div className="small:hidden mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 h-11 rounded-btn border-[1.6px] border-laly-line bg-white flex items-center justify-center gap-2 text-sm font-bold"
          data-testid="mobile-filters-button"
        >
          <Icon name="grid" size={17} />
          الفلاتر والترتيب
          {active > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-laly-teal text-white text-[11px] flex items-center justify-center">
              {active}
            </span>
          )}
        </button>
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="الفلاتر والترتيب"
        layout="mobile"
      >
        <div className="flex flex-col gap-4">
          <SortProducts currencyCode={currencyCode} />
          <Filters
            currencyCode={currencyCode}
            attributes={attributes}
            showCategories={showCategories}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="sticky bottom-0 h-12 rounded-btn bg-laly-teal text-white font-bold"
          >
            عرض النتائج
          </button>
        </div>
      </Sheet>
      <div className="hidden small:flex flex-col gap-4 small:w-[260px] small:shrink-0 small:me-6">
        <SortProducts currencyCode={currencyCode} />
        <Filters
          currencyCode={currencyCode}
          attributes={attributes}
          showCategories={showCategories}
        />
      </div>
    </>
  )
}

export default StoreRefinements
