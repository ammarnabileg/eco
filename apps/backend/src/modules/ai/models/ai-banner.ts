import { model } from "@medusajs/framework/utils"

// A marketing image designed in the admin studio. The design is kept (not
// only the exported PNG), so it can be reopened and edited without paying for
// a new background. Positions and sizes in `elements` are fractions of the
// canvas, so they survive a change of export size.
const AiBanner = model
  .define("ai_banner", {
    id: model.id({ prefix: "aibnr" }).primaryKey(),
    title: model.text(),
    product_id: model.text().nullable(),
    background_url: model.text().nullable(),
    product_image_url: model.text().nullable(),
    canvas_width: model.number(),
    canvas_height: model.number(),
    elements: model.json(),
    language: model.enum(["ar", "en", "both"]).default("ar"),
    status: model.enum(["draft", "approved"]).default("draft"),
    output_url: model.text().nullable(),
    /** The price shown on the image when it was approved: {amount, original_amount, currency_code, price_list_id, ends_at}. */
    price_snapshot: model.json().nullable(),
    slide_id: model.text().nullable(),
  })
  .indexes([{ on: ["updated_at"] }])

export default AiBanner
