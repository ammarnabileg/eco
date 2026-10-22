"use client"

import { useT } from "@i18n/client"
import SortRadioGroup from "@modules/store/components/sort-radio-group"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: string) => void
  "data-testid"?: string
}

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const t = useT()
  const sortOptions = [
    { value: "created_at", label: t("catalog.sort_newest") },
    { value: "price_asc", label: t("catalog.sort_price_asc") },
    { value: "price_desc", label: t("catalog.sort_price_desc") },
  ]

  const handleChange = (value: string) => {
    setQueryParams("sortBy", value as SortOptions)
  }

  return (
    <SortRadioGroup
      title={t("catalog.sort_by")}
      items={sortOptions}
      value={sortBy}
      handleChange={handleChange}
      data-testid={dataTestId}
    />
  )
}

export default SortProducts
