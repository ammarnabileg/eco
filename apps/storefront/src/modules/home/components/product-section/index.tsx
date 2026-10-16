import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import SectionHeading from "@modules/laly/components/section-heading"
import ProductCard, {
  PRODUCT_CARD_FIELDS,
} from "@modules/laly/components/product-card"

// A collection's products, either as a horizontal rail (scrolls on phones)
// or as a grid.
export default async function ProductSection({
  collection,
  region,
  layout,
  eyebrow,
}: {
  collection?: HttpTypes.StoreCollection | null
  region: HttpTypes.StoreRegion
  layout: "rail" | "grid"
  eyebrow?: string
}) {
  if (!collection) {
    return null
  }

  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      limit: 8,
      fields: PRODUCT_CARD_FIELDS,
    },
  })

  if (!products.length) {
    return null
  }

  return (
    <section className="content-container mt-10 small:mt-14">
      <SectionHeading
        eyebrow={eyebrow}
        title={collection.title}
        href={`/collections/${collection.handle}`}
      />
      {layout === "rail" ? (
        <ul className="flex gap-3 small:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 small:mx-0 small:px-0 small:grid small:grid-cols-4">
          {products.map((p, i) => (
            <li key={p.id} className="snap-start shrink-0 w-[46%] xsmall:w-[38%] small:w-auto">
              <ProductCard product={p} priority={i < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 small:grid-cols-4 gap-3 small:gap-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
