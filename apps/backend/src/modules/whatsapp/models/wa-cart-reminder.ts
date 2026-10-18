import { model } from "@medusajs/framework/utils"

// One abandoned-cart reminder per cart, never more.
const WaCartReminder = model
  .define("wa_cart_reminder", {
    id: model.id({ prefix: "wacr" }).primaryKey(),
    cart_id: model.text().unique(),
    phone: model.text(),
    status: model.enum(["sent", "failed"]).default("sent"),
    error: model.text().nullable(),
  })
  .indexes([{ on: ["phone", "created_at"] }])

export default WaCartReminder
