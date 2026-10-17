import { listCartPaymentMethods } from "@lib/data/payment"
import { listProducts } from "@lib/data/products"
import { CATALOG_PRODUCT_FIELDS } from "@lib/util/catalog"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real-time pricing and stock for a product and renders its actions.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  layout,
  whatsapp,
}: {
  id: string
  region: HttpTypes.StoreRegion
  layout: "mobile" | "desktop"
  whatsapp?: string | null
}) {
  const [product, providers] = await Promise.all([
    listProducts({
    queryParams: {
      id: [id],
      fields: `*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,*variants.images,*variants.options,+metadata,${CATALOG_PRODUCT_FIELDS}`,
    },
    regionId: region.id,
    }).then(({ response }) => response.products[0]),
    listCartPaymentMethods(region.id),
  ])

  if (!product) {
    return null
  }

  return (
    <ProductActions
      product={product}
      region={region}
      layout={layout}
      whatsapp={whatsapp}
      talyAvailable={!!providers?.some((p) => p.id.startsWith("pp_taly_"))}
    />
  )
}
