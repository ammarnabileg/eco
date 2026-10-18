import { model } from "@medusajs/framework/utils"

// One conversation per customer phone, shown in the admin inbox. `instance` is
// the WhatsApp number (Evolution instance) the last message went through.
const WaConversation = model
  .define("wa_conversation", {
    id: model.id({ prefix: "wacv" }).primaryKey(),
    phone: model.text().unique(),
    name: model.text().nullable(),
    instance: model.text().nullable(),
    last_message_at: model.dateTime().nullable(),
    last_preview: model.text().nullable(),
    unread: model.number().default(0),
  })
  .indexes([{ on: ["last_message_at"] }])

export default WaConversation
