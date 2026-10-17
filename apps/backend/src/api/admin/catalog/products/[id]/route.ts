import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { productAttributes } from "../../../../../workflows/catalog/steps/product-attributes"
import { updateProductCatalogWorkflow } from "../../../../../workflows/catalog/product-catalog"
import { UpdateProductCatalogType } from "../../validators"

// Everything the admin "catalog" panel of a product needs in one call: the
// saved values plus the spec fields its categories define.
async function load(req: MedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "product_detail.*", "brand.id", "brand.name", "addon_groups.id"],
    filters: { id: req.params.id },
  })
  if (!data[0]) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Product ${req.params.id} not found`)
  }
  const product = data[0]
  return {
    product_id: product.id,
    detail: product.product_detail ?? null,
    brand: product.brand ?? null,
    addon_group_ids: (product.addon_groups ?? []).map((g) => g?.id).filter(Boolean),
    attributes: await productAttributes(req.scope, product.id),
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ catalog: await load(req) })
}

export async function POST(req: MedusaRequest<UpdateProductCatalogType>, res: MedusaResponse) {
  await updateProductCatalogWorkflow(req.scope).run({
    input: { ...req.validatedBody, product_id: req.params.id },
  })
  res.json({ catalog: await load(req) })
}
