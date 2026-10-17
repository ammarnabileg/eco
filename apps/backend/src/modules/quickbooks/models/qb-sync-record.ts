import { model } from "@medusajs/framework/utils"

// What was sent to QuickBooks for each store record, so syncs are
// idempotent, updates carry the right SyncToken, and failures can be
// retried and shown to staff.
const QbSyncRecord = model
  .define("qb_sync_record", {
    id: model.id({ prefix: "qbs" }).primaryKey(),
    entity: model.enum(["order", "variant", "customer", "refund", "payment_method", "capture"]),
    local_id: model.text(),
    qb_type: model.text().nullable(),
    qb_id: model.text().nullable(),
    qb_sync_token: model.text().nullable(),
    status: model.enum(["synced", "failed", "skipped"]).default("synced"),
    error: model.text().nullable(),
    attempts: model.number().default(0),
    synced_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["entity", "local_id"], unique: true },
    { on: ["status"] },
  ])

export default QbSyncRecord
