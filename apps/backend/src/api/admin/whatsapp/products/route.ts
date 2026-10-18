import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SendProductsType } from "../../../store/whatsapp/validators"
import { sendProducts } from "../../../../workflows/whatsapp/rich"

// Staff send products to a customer on WhatsApp (cards, or a text list).
export async function POST(req: MedusaRequest<SendProductsType>, res: MedusaResponse) {
  const { phone, product_ids, note } = req.validatedBody
  res.json(await sendProducts(req.scope, phone, product_ids, note))
}
