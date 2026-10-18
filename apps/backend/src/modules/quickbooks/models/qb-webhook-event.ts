import { model } from "@medusajs/framework/utils"

// Changes QuickBooks reported through its webhook. The store stays the
// source of truth: events are recorded, and the ones touching records the
// store booked are flagged for staff, never applied automatically.
const QbWebhookEvent = model
  .define("qb_webhook_event", {
    id: model.id({ prefix: "qbe" }).primaryKey(),
    /** Intuit's event id (or a stable key for legacy payloads), for retries. */
    event_key: model.text(),
    realm_id: model.text(),
    entity: model.text(),
    entity_id: model.text(),
    operation: model.text(),
    occurred_at: model.dateTime().nullable(),
    /** The store record this QuickBooks entity was booked from, if any. */
    local_entity: model.text().nullable(),
    local_id: model.text().nullable(),
    attention: model.boolean().default(false),
    reviewed_at: model.dateTime().nullable(),
    raw: model.json().nullable(),
  })
  .indexes([
    { on: ["event_key"], unique: true },
    { on: ["attention", "reviewed_at"] },
  ])

export default QbWebhookEvent
