import { model } from "@medusajs/framework/utils"

// A published version of a content page, exactly as customers saw it.
const ContentPageRevision = model
  .define("content_page_revision", {
    id: model.id({ prefix: "cprev" }).primaryKey(),
    page_id: model.text(),
    slug: model.text(),
    version: model.number(),
    title_ar: model.text(),
    title_en: model.text(),
    summary_ar: model.text().nullable(),
    summary_en: model.text().nullable(),
    body_ar: model.text(),
    body_en: model.text(),
    faq: model.json().nullable(),
    published_by: model.text().nullable(),
  })
  .indexes([{ on: ["slug", "version"], unique: true }])

export default ContentPageRevision
