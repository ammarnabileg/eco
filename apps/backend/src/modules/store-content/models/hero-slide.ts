import { model } from "@medusajs/framework/utils"

// Homepage hero carousel. A slide shows only while active and inside its
// optional schedule window.
const HeroSlide = model.define("hero_slide", {
  id: model.id({ prefix: "hero" }).primaryKey(),
  eyebrow_ar: model.text().nullable(),
  eyebrow_en: model.text().nullable(),
  title_ar: model.text(),
  title_en: model.text(),
  highlight_ar: model.text().nullable(),
  highlight_en: model.text().nullable(),
  subtitle_ar: model.text().nullable(),
  subtitle_en: model.text().nullable(),
  cta_label_ar: model.text().nullable(),
  cta_label_en: model.text().nullable(),
  cta_url: model.text().nullable(),
  image_url: model.text().nullable(),
  rank: model.number().default(0),
  is_active: model.boolean().default(true),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
})

export default HeroSlide
