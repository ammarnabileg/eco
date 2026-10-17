import { PRODUCT_INDEX_NAME, priceAttribute } from "@lib/search-client"

export const OPTION_VALUES_ATTRIBUTE = "option_values"
export const CATEGORY_ATTRIBUTE = "category"
// The index calls the product's tags "labels".
export const LABELS_ATTRIBUTE = "labels"
export const BRAND_ATTRIBUTE = "brand"
// Filterable specs as "key:value", labelled by the category's spec template.
export const SPECS_ATTRIBUTE = "specs"

export const getSortOptions = (currencyCode: string) => {
  const minPrice = priceAttribute("min_price", currencyCode)

  return [
    { value: PRODUCT_INDEX_NAME, label: "الأكثر صلة" },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/created_at:desc`,
      label: "الأحدث",
    },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/${minPrice}:asc`,
      label: "السعر: من الأقل للأعلى",
    },
    {
      value: `${PRODUCT_INDEX_NAME}/sort/${minPrice}:desc`,
      label: "السعر: من الأعلى للأقل",
    },
    { value: `${PRODUCT_INDEX_NAME}/sort/title:asc`, label: "الاسم: أ - ي" },
    { value: `${PRODUCT_INDEX_NAME}/sort/title:desc`, label: "الاسم: ي - أ" },
  ]
}
