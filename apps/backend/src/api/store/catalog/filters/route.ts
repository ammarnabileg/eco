import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { attributesByCategory } from "../../../../workflows/catalog/steps/product-attributes"

/**
 * Labels for the storefront filters of a category: its filterable spec fields
 * (with option labels in both languages) and the active brands. Facet counts
 * come from the search index; this only says what the keys mean.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const categoryId = typeof req.query.category_id === "string" ? req.query.category_id : undefined

  const attributes = categoryId
    ? ((await attributesByCategory(query, [categoryId])).get(categoryId) ?? []).filter((a) => a.filterable)
    : []

  const { data: brands } = await query.graph({
    entity: "brand",
    fields: ["id", "name", "handle", "logo_url"],
    filters: { is_active: true },
    pagination: { order: { rank: "ASC" } },
  })

  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({ attributes, brands })
}
