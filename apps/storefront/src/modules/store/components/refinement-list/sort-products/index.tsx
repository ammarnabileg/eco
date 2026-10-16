"use client"

import SortRadioGroup from "@modules/store/components/sort-radio-group"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: string) => void
  "data-testid"?: string
}

const sortOptions = [
  {
    value: "created_at",
    label: "الأحدث",
  },
  {
    value: "price_asc",
    label: "السعر: من الأقل للأعلى",
  },
  {
    value: "price_desc",
    label: "السعر: من الأعلى للأقل",
  },
]

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const handleChange = (value: string) => {
    setQueryParams("sortBy", value as SortOptions)
  }

  return (
    <SortRadioGroup
      title="ترتيب حسب"
      items={sortOptions}
      value={sortBy}
      handleChange={handleChange}
      data-testid={dataTestId}
    />
  )
}

export default SortProducts
