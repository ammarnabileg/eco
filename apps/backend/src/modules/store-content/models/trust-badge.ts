import { model } from "@medusajs/framework/utils"

// Customer-facing commitments (warranty, returns, delivery...). Each one is a
// promise to the customer, so it is managed from the admin, not hard-coded.
const TrustBadge = model.define("trust_badge", {
  id: model.id({ prefix: "tbdg" }).primaryKey(),
  icon: model.text(),
  title_ar: model.text(),
  title_en: model.text(),
  subtitle_ar: model.text().nullable(),
  subtitle_en: model.text().nullable(),
  rank: model.number().default(0),
  is_active: model.boolean().default(true),
})

export default TrustBadge
