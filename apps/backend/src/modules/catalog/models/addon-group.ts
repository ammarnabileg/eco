import { model } from "@medusajs/framework/utils"

import AddonOption from "./addon-option"

// A set of optional parts sold with a product: RAM upgrade, extra SSD,
// surveillance HDD, memory card, installation... Attached per product.
const AddonGroup = model
  .define("addon_group", {
    id: model.id({ prefix: "adgp" }).primaryKey(),
    name_ar: model.text(),
    name_en: model.text(),
    kind: model
      .enum(["ram", "ssd", "hdd", "memory_card", "installation", "warranty", "other"])
      .default("other"),
    selection: model.enum(["single", "multiple"]).default("single"),
    is_required: model.boolean().default(false),
    rank: model.number().default(0),
    options: model.hasMany(() => AddonOption, { mappedBy: "group" }),
  })
  .cascades({ delete: ["options"] })

export default AddonGroup
