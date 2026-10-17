import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { addConfiguredItemWorkflow } from "../../../../../workflows/catalog/add-configured-item"
import { AddConfiguredItemType } from "../../../catalog/validators"

// Adds a product with its chosen add-ons (RAM, SSD, HDD...) priced on the server.
export async function POST(req: MedusaRequest<AddConfiguredItemType>, res: MedusaResponse) {
  await addConfiguredItemWorkflow(req.scope).run({
    input: { ...req.validatedBody, cart_id: req.params.id },
  })
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "currency_code", "total", "subtotal", "items.*"],
    filters: { id: req.params.id },
  })
  res.json({ cart: data[0] })
}
