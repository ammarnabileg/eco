import { model } from "@medusajs/framework/utils"

// A customer asking to book an installation (cameras, Wi-Fi, smart home...).
// Staff follow it up from the admin; nothing is promised automatically.
const InstallRequest = model
  .define("install_request", {
    id: model.id({ prefix: "ireq" }).primaryKey(),
    customer_name: model.text(),
    phone: model.text(),
    /** Stored in Arabic, as in addresses (العاصمة، حولي...). */
    governorate: model.text(),
    area: model.text().nullable(),
    service: model.enum(["cctv", "networking", "smart_home", "intercom", "other"]),
    preferred_date: model.text().nullable(),
    message: model.text().nullable(),
    product_id: model.text().nullable(),
    customer_id: model.text().nullable(),
    locale: model.text().default("ar"),
    status: model.enum(["new", "contacted", "scheduled", "done", "cancelled"]).default("new"),
    admin_note: model.text().nullable(),
  })
  .indexes([{ on: ["status"] }, { on: ["created_at"] }])

export default InstallRequest
