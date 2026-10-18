import { model } from "@medusajs/framework/utils"

// A WhatsApp number (Evolution instance) in the sending pool. Each customer
// sticks to one number; a number past its daily limit or disconnected is
// skipped. All instances use the API key saved in the integration settings.
const WaNumber = model.define("wa_number", {
  id: model.id({ prefix: "wanum" }).primaryKey(),
  label: model.text(),
  instance: model.text().unique(),
  phone: model.text().nullable(),
  enabled: model.boolean().default(true),
  daily_limit: model.number().default(200),
  state: model.text().nullable(),
  checked_at: model.dateTime().nullable(),
  last_error: model.text().nullable(),
})

export default WaNumber
