import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductCard, { PRODUCT_CARD_FIELDS } from "@modules/laly/components/product-card"
import SectionHeading from "@modules/laly/components/section-heading"

// Other products from the same category (falls back to the same collection).
export default async function RelatedProducts({
  product,
  countryCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
}) {
  const categoryIds = (product.categories ?? []).map((c) => c.id)
  const queryParams: HttpTypes.StoreProductListParams = {
    limit: 9,
    fields: PRODUCT_CARD_FIELDS,
    ...(categoryIds.length
      ? { category_id: categoryIds }
      : product.collection_id
        ? { collection_id: [product.collection_id] }
        : {}),
  }

  const products = await listProducts({ queryParams, countryCode }).then(
    ({ response }) => response.products.filter((p) => p.id !== product.id).slice(0, 8)
  )

  if (!products.length) {
    return null
  }

  return (
    <section>
      <SectionHeading title="منتجات قد تعجبك" eyebrow="من نفس القسم" />
      <ul className="flex gap-3 small:gap-4 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 small:mx-0 small:px-0 small:grid small:grid-cols-4">
        {products.map((p) => (
          <li key={p.id} className="snap-start shrink-0 w-[46%] small:w-auto">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}
