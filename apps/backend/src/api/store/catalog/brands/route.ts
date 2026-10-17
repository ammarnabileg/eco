import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "brand",
    fields: ["id", "name", "handle", "logo_url", "description_ar", "description_en"],
    filters: { is_active: true },
    pagination: { order: { rank: "ASC" } },
  })
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({ brands: data })
}
