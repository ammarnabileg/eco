import { model } from "@medusajs/framework/utils"

// One-time codes sent on WhatsApp to confirm a guest's phone before paying.
// Only a keyed hash of the code is stored.
const WaOtp = model
  .define("wa_otp", {
    id: model.id({ prefix: "waotp" }).primaryKey(),
    cart_id: model.text(),
    phone: model.text(),
    code_hash: model.text(),
    expires_at: model.dateTime(),
    attempts: model.number().default(0),
    verified_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["cart_id"] }, { on: ["phone", "created_at"] }])

export default WaOtp
