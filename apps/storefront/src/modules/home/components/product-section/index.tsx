import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import SectionHeading from "@modules/laly/components/section-heading"
import ProductCard, {
  PRODUCT_CARD_FIELDS,
} from "@modules/laly/components/product-card"

// A row of products, either as a horizontal rail (scrolls on phones) or as a
// grid. Products come from a collection or from an explicit id list (offers,
// personal picks).
export default async function ProductSection({
  title,
  href,
  region,
  layout,
  eyebrow,
  collectionId,
  productIds,
  offerEnds = {},
  extra,
  limit = 8,
  contained = true,
}: {
  title: string
  href?: string
  region: HttpTypes.StoreRegion
  layout: "rail" | "grid"
  eyebrow?: string
  collectionId?: string
  productIds?: string[]
  offerEnds?: Record<string, string>
  extra?: React.ReactNode
  limit?: number
  /** False inside a page that already has its own container (account). */
  contained?: boolean
}) {
  if (!collectionId && !productIds?.length) {
    return null
  }

  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      ...(collectionId ? { collection_id: collectionId } : { id: productIds }),
      limit,
      fields: PRODUCT_CARD_FIELDS,
    },
  })

  // An id list keeps its own order (most relevant first).
  if (productIds?.length && !collectionId) {
    products.sort((a, b) => productIds.indexOf(a.id) - productIds.indexOf(b.id))
  }

  if (!products.length) {
    return null
  }

  return (
    <section className={contained ? "content-container mt-10 small:mt-14" : "mt-8"}>
      <SectionHeading eyebrow={eyebrow} title={title} href={href} extra={extra} />
      {layout === "rail" ? (
        <ul className="flex gap-3 small:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 small:mx-0 small:px-0 small:grid small:grid-cols-4">
          {products.map((p, i) => (
            <li key={p.id} className="snap-start shrink-0 w-[46%] xsmall:w-[38%] small:w-auto">
              <ProductCard product={p} priority={i < 2} offerEndsAt={offerEnds[p.id]} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 small:grid-cols-4 gap-3 small:gap-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} offerEndsAt={offerEnds[p.id]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
