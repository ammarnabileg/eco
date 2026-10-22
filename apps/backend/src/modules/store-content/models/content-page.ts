import { model } from "@medusajs/framework/utils"

// An information or policy page (about, FAQ, privacy, terms, returns,
// shipping, warranty). The row holds the working draft; customers only ever
// see a published revision, so editing never changes the live page until the
// next publish. Every publish keeps a numbered copy for the record.
const ContentPage = model
  .define("content_page", {
    id: model.id({ prefix: "cpage" }).primaryKey(),
    slug: model.text(),
    title_ar: model.text(),
    title_en: model.text().default(""),
    summary_ar: model.text().nullable(),
    summary_en: model.text().nullable(),
    /** Simple text: "## " headings, "- " lists, **bold** and [links](https://…). Never HTML. */
    body_ar: model.text().default(""),
    body_en: model.text().default(""),
    /** FAQ page only: [{group_ar, group_en, q_ar, a_ar, q_en, a_en}]. */
    faq: model.json().nullable(),
    is_published: model.boolean().default(false),
    /** Saved since the last publish: customers still see the older version. */
    has_draft_changes: model.boolean().default(true),
    version: model.number().default(0),
    published_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["slug"], unique: true, where: "deleted_at IS NULL" }])

export default ContentPage
