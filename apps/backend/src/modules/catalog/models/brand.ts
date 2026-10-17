import { model } from "@medusajs/framework/utils"

// A product brand (Hikvision, TP-Link, Tapo...). One brand per product.
const Brand = model.define("brand", {
  id: model.id({ prefix: "brnd" }).primaryKey(),
  name: model.text().searchable(),
  handle: model.text().unique(),
  logo_url: model.text().nullable(),
  description_ar: model.text().nullable(),
  description_en: model.text().nullable(),
  rank: model.number().default(0),
  is_active: model.boolean().default(true),
})

export default Brand
