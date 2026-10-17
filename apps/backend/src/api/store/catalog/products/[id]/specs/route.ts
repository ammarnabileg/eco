import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { SpecValues, specTable } from "../../../../../../modules/catalog/specs"
import { productAttributes } from "../../../../../../workflows/catalog/steps/product-attributes"

// The product's spec table, ready to render: grouped rows with labels and
// values in Arabic and English, in template order.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "status", "product_detail.specs"],
    filters: { id: req.params.id },
  })
  const product = data[0]
  if (!product || product.status !== "published") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
  }
  const attributes = await productAttributes(req.scope, product.id)
  const specs = (product.product_detail?.specs ?? null) as SpecValues | null
  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({ groups: specTable(attributes, specs) })
}
