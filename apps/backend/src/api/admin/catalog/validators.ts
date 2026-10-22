import { z } from "@medusajs/framework/zod"

const text = (max = 200) => z.string().trim().min(1).max(max)
const optionalText = (max = 500) => z.string().trim().max(max).nullish()
const httpsUrl = z.string().url().startsWith("https://").nullish()

export const SpecAttributeSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/, "lowercase letters, digits and _"),
    label_ar: text(),
    label_en: text(),
    type: z.enum(["text", "number", "boolean", "select", "multiselect"]),
    unit: optionalText(20),
    options: z
      .array(z.object({ value: z.string().trim().min(1).max(80), label_ar: text(), label_en: text() }).strict())
      .max(200)
      .optional(),
    group_ar: optionalText(100),
    group_en: optionalText(100),
    filterable: z.boolean().optional(),
    required: z.boolean().optional(),
  })
  .strict()

const brandFields = {
  name: text(),
  handle: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase-with-dashes"),
  logo_url: httpsUrl,
  description_ar: optionalText(2000),
  description_en: optionalText(2000),
  rank: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
}
export const CreateBrand = z.object(brandFields).strict()
export type CreateBrandType = z.infer<typeof CreateBrand>
export const UpdateBrand = z.object(brandFields).partial().strict()
export type UpdateBrandType = z.infer<typeof UpdateBrand>

const templateFields = {
  name_ar: text(),
  name_en: text(),
  attributes: z.array(SpecAttributeSchema).max(80),
  rank: z.number().int().min(0).optional(),
  category_ids: z.array(z.string().min(1)).max(100).optional(),
}
export const CreateSpecTemplate = z.object(templateFields).strict()
export type CreateSpecTemplateType = z.infer<typeof CreateSpecTemplate>
export const UpdateSpecTemplate = z.object(templateFields).partial().strict()
export type UpdateSpecTemplateType = z.infer<typeof UpdateSpecTemplate>

const addonOption = z
  .object({
    id: z.string().optional(),
    name_ar: text(),
    name_en: text(),
    price: z.number().min(0).max(100000),
    sku: optionalText(80),
    is_active: z.boolean().optional(),
    rank: z.number().int().min(0).optional(),
  })
  .strict()
const addonGroupFields = {
  name_ar: text(),
  name_en: text(),
  kind: z.enum(["ram", "ssd", "hdd", "memory_card", "installation", "warranty", "other"]).optional(),
  selection: z.enum(["single", "multiple"]).optional(),
  is_required: z.boolean().optional(),
  rank: z.number().int().min(0).optional(),
  options: z.array(addonOption).max(50).optional(),
}
export const CreateAddonGroup = z.object(addonGroupFields).strict()
export type CreateAddonGroupType = z.infer<typeof CreateAddonGroup>
export const UpdateAddonGroup = z.object(addonGroupFields).partial().strict()
export type UpdateAddonGroupType = z.infer<typeof UpdateAddonGroup>

export const UpdateQuoteRequest = z
  .object({
    status: z.enum(["new", "contacted", "quoted", "won", "lost"]).optional(),
    admin_note: optionalText(2000),
  })
  .strict()
export type UpdateQuoteRequestType = z.infer<typeof UpdateQuoteRequest>

export const UpdateInstallRequest = z
  .object({
    status: z.enum(["new", "contacted", "scheduled", "done", "cancelled"]).optional(),
    admin_note: optionalText(2000),
  })
  .strict()
export type UpdateInstallRequestType = z.infer<typeof UpdateInstallRequest>

const specValue = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
  z.array(z.string().max(80)).max(50),
  z.object({ ar: z.string().max(500), en: z.string().max(500) }).strict(),
  z.null(),
])

const faqEntry = z
  .object({
    question_ar: text(300),
    answer_ar: text(2000),
    question_en: text(300),
    answer_en: text(2000),
  })
  .strict()

export const UpdateProductCatalog = z
  .object({
    detail: z
      .object({
        title_en: optionalText(300),
        subtitle_ar: optionalText(300),
        subtitle_en: optionalText(300),
        description_en: optionalText(20000),
        highlights_ar: z.array(text(300)).max(12).nullish(),
        highlights_en: z.array(text(300)).max(12).nullish(),
        specs: z.record(z.string(), specValue).nullish(),
        faq: z.array(faqEntry).max(20).nullish(),
        seo_title_ar: optionalText(70),
        seo_title_en: optionalText(70),
        seo_description_ar: optionalText(170),
        seo_description_en: optionalText(170),
        mpn: optionalText(80),
        series: optionalText(80),
        price_on_request: z.boolean().optional(),
        warranty_months: z.number().int().min(0).max(120).nullish(),
        source_url: httpsUrl,
      })
      .strict()
      .optional(),
    brand_id: z.string().min(1).nullish(),
    addon_group_ids: z.array(z.string().min(1)).max(20).optional(),
  })
  .strict()
export type UpdateProductCatalogType = z.infer<typeof UpdateProductCatalog>
