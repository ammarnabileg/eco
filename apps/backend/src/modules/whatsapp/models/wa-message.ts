import { model } from "@medusajs/framework/utils"

// Every WhatsApp message sent or received, for the admin inbox and limits.
const WaMessage = model
  .define("wa_message", {
    id: model.id({ prefix: "wamsg" }).primaryKey(),
    conversation_id: model.text(),
    phone: model.text(),
    instance: model.text().nullable(),
    direction: model.enum(["in", "out"]),
    kind: model.text(),
    body: model.text(),
    status: model.enum(["sent", "failed", "received"]),
    error: model.text().nullable(),
    external_id: model.text().nullable(),
    author_id: model.text().nullable(),
  })
  .indexes([
    { on: ["conversation_id", "created_at"] },
    { on: ["instance", "direction", "created_at"] },
  ])

export default WaMessage
