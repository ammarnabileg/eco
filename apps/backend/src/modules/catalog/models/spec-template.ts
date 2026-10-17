import { model } from "@medusajs/framework/utils"

// The spec fields a kind of product has ("IP camera": resolution, lens...).
// Linked to the categories it applies to; the admin product form and the
// storefront filters are generated from it.
const SpecTemplate = model.define("spec_template", {
  id: model.id({ prefix: "spct" }).primaryKey(),
  name_ar: model.text(),
  name_en: model.text(),
  // SpecAttribute[]
  attributes: model.json(),
  rank: model.number().default(0),
})

export default SpecTemplate
