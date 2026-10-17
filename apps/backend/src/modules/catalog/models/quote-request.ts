import { model } from "@medusajs/framework/utils"

// A customer asking for a price on a price-on-request product.
const QuoteRequest = model
  .define("quote_request", {
    id: model.id({ prefix: "qreq" }).primaryKey(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    product_title: model.text(),
    customer_name: model.text(),
    phone: model.text(),
    email: model.text().nullable(),
    company: model.text().nullable(),
    quantity: model.number().default(1),
    message: model.text().nullable(),
    customer_id: model.text().nullable(),
    locale: model.text().default("ar"),
    status: model.enum(["new", "contacted", "quoted", "won", "lost"]).default("new"),
    admin_note: model.text().nullable(),
  })
  .indexes([{ on: ["status"] }])

export default QuoteRequest
