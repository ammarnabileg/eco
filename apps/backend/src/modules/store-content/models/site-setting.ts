import { model } from "@medusajs/framework/utils"

// Singleton row: store-wide contact details shown in the header, footer, and
// WhatsApp button. Empty values hide the matching link on the storefront.
const SiteSetting = model.define("site_setting", {
  id: model.id({ prefix: "sset" }).primaryKey(),
  whatsapp: model.text().nullable(),
  phone: model.text().nullable(),
  email: model.text().nullable(),
  address_ar: model.text().nullable(),
  address_en: model.text().nullable(),
  hours_ar: model.text().nullable(),
  hours_en: model.text().nullable(),
})

export default SiteSetting
