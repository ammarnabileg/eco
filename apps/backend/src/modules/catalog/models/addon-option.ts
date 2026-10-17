import { model } from "@medusajs/framework/utils"

import AddonGroup from "./addon-group"

const AddonOption = model.define("addon_option", {
  id: model.id({ prefix: "adop" }).primaryKey(),
  name_ar: model.text(),
  name_en: model.text(),
  // Added to the product price, in the store currency (KWD).
  price: model.bigNumber(),
  sku: model.text().nullable(),
  is_active: model.boolean().default(true),
  rank: model.number().default(0),
  group: model.belongsTo(() => AddonGroup, { mappedBy: "options" }),
})

export default AddonOption
