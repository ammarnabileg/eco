import { model } from "@medusajs/framework/utils"

// Everything the core product model lacks for an Arabic-first catalogue: the
// English copy, structured specs, FAQ (for GEO), SEO overrides and the
// price-on-request flag. The product's own title/description hold the Arabic.
const ProductDetail = model.define("product_detail", {
  id: model.id({ prefix: "pdet" }).primaryKey(),
  title_en: model.text().nullable(),
  subtitle_ar: model.text().nullable(),
  subtitle_en: model.text().nullable(),
  description_en: model.text().nullable(),
  // string[]
  highlights_ar: model.json().nullable(),
  highlights_en: model.json().nullable(),
  // string[]: what is in the box, from the manufacturer's page
  box_contents_ar: model.json().nullable(),
  box_contents_en: model.json().nullable(),
  // Record<spec key, SpecValue>, validated against the category spec templates
  specs: model.json().nullable(),
  // FaqEntry[]
  faq: model.json().nullable(),
  seo_title_ar: model.text().nullable(),
  seo_title_en: model.text().nullable(),
  seo_description_ar: model.text().nullable(),
  seo_description_en: model.text().nullable(),
  // Manufacturer part number: what customers and Google search for.
  mpn: model.text().nullable(),
  series: model.text().nullable(),
  price_on_request: model.boolean().default(false),
  warranty_months: model.number().nullable(),
  // Official source the specs were taken from.
  source_url: model.text().nullable(),
})

export default ProductDetail
