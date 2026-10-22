import type { Translate } from "@i18n/translate"
import { PRODUCT_INDEX_NAME, priceAttribute } from "@lib/search-client"

export const OPTION_VALUES_ATTRIBUTE = "option_values"
export const CATEGORY_ATTRIBUTE = "category"
// The index calls the product's tags "labels".
export const LABELS_ATTRIBUTE = "labels"
export const BRAND_ATTRIBUTE = "brand"
// Filterable specs as "key:value", labelled by the category's spec template.
export const SPECS_ATTRIBUTE = "specs"

export const getSortOptions = (currencyCode: string, t: Translate) => {
  const minPrice = priceAttribute("min_price", currencyCode)

  return [
    { value: PRODUCT_INDEX_NAME, label: t("catalog.sort_relevance") },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/created_at:desc`,
      label: t("catalog.sort_newest"),
    },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/${minPrice}:asc`,
      label: t("catalog.sort_price_asc"),
    },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/${minPrice}:desc`,
      label: t("catalog.sort_price_desc"),
    },
    { value: `${PRODUCT_INDEX_NAME}/sort/title:asc`, label: t("catalog.sort_name_asc") },
    { value: `${PRODUCT_INDEX_NAME}/sort/title:desc`, label: t("catalog.sort_name_desc") },
  ]
}
