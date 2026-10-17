import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCatalogFilters } from "@lib/data/catalog"
import { getCategoryByHandle } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
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

  const title = productCategory.name
  const description =
    productCategory.description || `تسوّق منتجات ${title} من Laly في الكويت.`
  const indexable = await hasProducts(
    categoryTreeIds(productCategory),
    params.countryCode
  )

  return {
    title,
    description,
    alternates: {
      canonical: `/${params.countryCode}/categories/${params.category.join(
        "/"
      )}`,
    },
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

  const { attributes } = await getCatalogFilters(productCategory.id)

  return (
    <CategoryTemplate
      category={productCategory}
      countryCode={params.countryCode}
      currencyCode={region.currency_code}
      attributes={attributes}
    />
  )
}
