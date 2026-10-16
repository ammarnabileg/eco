import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const EVERY_MINUTES = 5
// Look back over two runs so a delayed or skipped run loses nothing;
// re-indexing a product twice is harmless.
const WINDOW_MS = 2 * EVERY_MINUTES * 60 * 1000

/**
 * Offers (sale price lists) emit no events, and crossing a start or end date
 * changes prices silently, so the search index would keep stale prices and a
 * stale "on sale" flag. Every few minutes this finds offers that started,
 * ended, were edited, or were deleted within the window and re-indexes their
 * products through the search module's normal event path.
 */
export default async function syncOfferSearchPrices(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const search = container.resolve(Modules.SEARCH)

  const now = Date.now()
  const inWindow = (value?: string | Date | null) => {
    if (!value) return false
    const t = new Date(value).getTime()
    return t > now - WINDOW_MS && t <= now
  }

  const { data: priceLists } = await query.graph({
    entity: "price_list",
    fields: [
      "id",
      "starts_at",
      "ends_at",
      "updated_at",
      "deleted_at",
      "prices.updated_at",
      "prices.price_set.variant.product_id",
    ],
    withDeleted: true,
  })

  const productIds = new Set<string>()
  for (const pl of priceLists) {
    const prices = pl.prices ?? []
    const touched =
      inWindow(pl.starts_at) ||
      inWindow(pl.ends_at) ||
      inWindow(pl.updated_at) ||
      inWindow(pl.deleted_at) ||
      prices.some((p) => inWindow(p?.updated_at))
    if (touched) {
      prices.forEach((p) => {
        const id = p?.price_set?.variant?.product_id
        if (id) productIds.add(id)
      })
    }
  }

  if (!productIds.size) {
    return
  }
  await search.ingest({
    name: "product.updated",
    data: [...productIds].map((id) => ({ id })),
  })
  logger.info(`Search: re-indexed ${productIds.size} product(s) after offer changes`)
}

export const config = {
  name: "sync-offer-search-prices",
  schedule: `*/${EVERY_MINUTES} * * * *`,
}
