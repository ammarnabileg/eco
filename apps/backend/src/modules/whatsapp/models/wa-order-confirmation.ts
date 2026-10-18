import { model } from "@medusajs/framework/utils"

// The order summary sent on WhatsApp and the customer's reply to it.
const WaOrderConfirmation = model
  .define("wa_order_confirmation", {
    id: model.id({ prefix: "waoc" }).primaryKey(),
    order_id: model.text(),
    phone: model.text(),
    status: model.enum(["sent", "failed", "confirmed", "cancel_requested"]).default("sent"),
    error: model.text().nullable(),
    responded_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["order_id"], unique: true },
    { on: ["phone", "status"] },
  ])

export default WaOrderConfirmation
