import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real-time pricing and stock for a product and renders its actions.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  layout,
}: {
  id: string
  region: HttpTypes.StoreRegion
  layout: "mobile" | "desktop"
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} layout={layout} />
}
