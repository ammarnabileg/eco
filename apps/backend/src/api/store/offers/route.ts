import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Public sale offers running right now, created in the admin under Price
// Lists. Medusa stops applying a list's prices after its end date; this route
// tells the storefront which products are on offer and when each offer ends,
// so countdowns are real. Lists restricted by rules (e.g. customer groups)
// are not public and are left out.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()

  const { data: priceLists } = await query.graph({
    entity: "price_list",
    fields: [
      "id",
      "title",
      "description",
      "starts_at",
      "ends_at",
      "rules_count",
      "prices.price_set.variant.product_id",
    ],
    filters: { status: "active", type: "sale" },
  })

  const offers = priceLists
    .filter(
      (pl) =>
        !pl.rules_count &&
        (!pl.starts_at || new Date(pl.starts_at) <= now) &&
        (!pl.ends_at || new Date(pl.ends_at) > now)
    )
    .map((pl) => ({
      id: pl.id,
      title: pl.title,
      description: pl.description,
      starts_at: pl.starts_at,
      ends_at: pl.ends_at,
      product_ids: [
        ...new Set(
          (pl.prices ?? [])
            .map((p) => p?.price_set?.variant?.product_id)
            .filter((id): id is string => !!id)
        ),
      ],
    }))
    .filter((offer) => offer.product_ids.length > 0)

  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({ offers })
}
