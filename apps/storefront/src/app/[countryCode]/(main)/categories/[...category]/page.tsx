import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCatalogFilters } from "@lib/data/catalog"
import { getCategoryByHandle } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getLocale, getT, languageAlternates } from "@i18n/server"
import { categoryDescription, categoryName } from "@lib/util/category-name"
import { categoryTreeIds } from "@lib/util/categories"
import CategoryTemplate from "@modules/categories/templates"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
}

// Whether the category or any sub-category holds a published product.
const hasProducts = async (ids: string[], countryCode: string) =>
  listProducts({
    countryCode,
    queryParams: { category_id: ids, limit: 1, fields: "id" },
  })
    .then(({ response }) => response.count > 0)
    .catch(() => true)

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const productCategory = await getCategoryByHandle(params.category).catch(
    () => null
  )

  if (!productCategory) {
    notFound()
  }

  const [t, locale] = await Promise.all([getT(), getLocale()])
  const title = categoryName(productCategory, locale)
  const description =
    categoryDescription(productCategory, locale) || t("pages.category_description", { name: title })
  const indexable = await hasProducts(
    categoryTreeIds(productCategory),
    params.countryCode
  )

  return {
    title,
    description,
    alternates: await languageAlternates(params.countryCode),
    // An empty category is a thin page: keep it out of search results.
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  }
}

export default async function CategoryPage(props: Props) {
  const params = await props.params

  const [productCategory, region] = await Promise.all([
    getCategoryByHandle(params.category),
    getRegion(params.countryCode),
  ])

  if (!productCategory || !region) {
    notFound()
  }

  // The store API leaves products out of nested categories, so ask per
  // sub-category whether it (or one of its own) has products to show.
  const children = productCategory.category_children ?? []
  const [{ attributes }, filled] = await Promise.all([
    getCatalogFilters(productCategory.id),
    Promise.all(children.map((c) => hasProducts(categoryTreeIds(c), params.countryCode))),
  ])
  const childrenWithProducts = children.filter((_, i) => filled[i]).map((c) => c.id)

  return (
    <CategoryTemplate
      category={productCategory}
      countryCode={params.countryCode}
      currencyCode={region.currency_code}
      attributes={attributes}
      childrenWithProducts={childrenWithProducts}
    />
  )
}
