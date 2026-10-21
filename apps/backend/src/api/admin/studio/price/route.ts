import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { productPrice } from "../../../../workflows/studio"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.query.product_id ?? "")
  if (!id.startsWith("prod_")) throw new MedusaError(MedusaError.Types.INVALID_DATA, "product_id is required")
  res.json({ price: await productPrice(req.scope, id) })
}
