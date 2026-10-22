import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Active brands with how many published products each has, for the brands
// page and brand links. Brands without products are left out.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "brand",
    fields: ["id", "name", "handle", "logo_url", "description_ar", "description_en", "products.id", "products.status"],
    filters: { is_active: true },
    pagination: { order: { rank: "ASC" } },
  })
  const brands = (data as { products?: { status?: string }[] | null; [k: string]: unknown }[])
    .map(({ products, ...brand }) => ({
      ...brand,
      product_count: (products ?? []).filter((p) => p?.status === "published").length,
    }))
    .filter((b) => b.product_count > 0)
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({ brands })
}
