import { model } from "@medusajs/framework/utils"

// A customer asking to return, exchange or claim warranty on items of an order.
// It is only a request: staff review it and decide. Nothing here creates a
// Medusa return or a refund automatically.
const AfterSalesRequest = model
  .define("after_sales_request", {
    id: model.id({ prefix: "asreq" }).primaryKey(),
    kind: model.enum(["return", "exchange", "warranty"]),
    order_id: model.text(),
    order_display_id: model.number(),
    customer_id: model.text().nullable(),
    /** [{ line_item_id, title, quantity }] copied from the order at request time. */
    items: model.json(),
    reason: model.enum(["defective", "wrong_item", "not_as_described", "changed_mind", "other"]),
    details: model.text().nullable(),
    phone: model.text(),
    status: model.enum(["new", "reviewing", "approved", "rejected", "received", "completed"]).default("new"),
    admin_note: model.text().nullable(),
    locale: model.text().default("ar"),
  })
  .indexes([{ on: ["status"] }, { on: ["created_at"] }, { on: ["order_id"] }, { on: ["customer_id"] }])

export default AfterSalesRequest
