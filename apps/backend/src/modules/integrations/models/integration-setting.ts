import { model } from "@medusajs/framework/utils"

// One row per third-party service. Plain values in `config`; secrets are
// encrypted together in `secrets` and never leave the server.
const IntegrationSetting = model
  .define("integration_setting", {
    id: model.id({ prefix: "intg" }).primaryKey(),
    key: model.text(),
    enabled: model.boolean().default(false),
    config: model.json().nullable(),
    secrets: model.text().nullable(),
  })
  .indexes([{ on: ["key"], unique: true, where: "deleted_at IS NULL" }])

export default IntegrationSetting
