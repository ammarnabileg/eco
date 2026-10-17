import { model } from "@medusajs/framework/utils"

// The connected QuickBooks company. Tokens are stored encrypted
// (AES-256-GCM, see crypto.ts); there is at most one row.
const QbConnection = model.define("qb_connection", {
  id: model.id({ prefix: "qbc" }).primaryKey(),
  realm_id: model.text(),
  environment: model.enum(["sandbox", "production"]).default("sandbox"),
  company_name: model.text().nullable(),
  access_token: model.text(),
  refresh_token: model.text(),
  access_expires_at: model.dateTime(),
  refresh_expires_at: model.dateTime().nullable(),
  // Accounts and items picked when connecting; editable from the admin.
  income_account_id: model.text().nullable(),
  deposit_account_id: model.text().nullable(),
  shipping_item_id: model.text().nullable(),
  refund_item_id: model.text().nullable(),
  currency: model.text().default("KWD"),
})

export default QbConnection
