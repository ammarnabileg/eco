import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { CATALOG_MODULE } from "../../modules/catalog"
import CatalogModuleService from "../../modules/catalog/service"
import { SpecAttribute, validateSpecs } from "../../modules/catalog/specs"
import { attributesByCategory } from "../catalog/steps/product-attributes"
import { newRunId } from "../ai/usage"
import { aiText, parseJsonObject } from "./ai"
import { fetchPage } from "./source"

// First step of adding a product with AI: read the official page and write a
// complete draft (Arabic and English copy, specs, SEO, FAQ), propose the
// category, brand, add-ons and variants, and list questions for the admin.
// Nothing is saved here; the admin reviews the draft before creating.

export type DraftInput = {
  name: string
  brand?: string | null
  category_id?: string | null
  source_url?: string | null
  source_text?: string | null
  price_kwd?: number | null
  notes?: string | null
}

type Query = { graph: (q: Record<string, unknown>) => Promise<{ data: unknown[] }> }

const SYSTEM = `You write product listings for Laly, an electronics store in Kuwait (Arabic first, English second).
Accuracy is everything: customers buy on these facts.

Rules:
- Facts (specs, numbers, features, compatibility, warranty) come ONLY from the SOURCE text given. Never invent or "typical" a number. If something is not in the source, leave it out and list the spec key in "missing_specs".
- If there is no SOURCE text, write general copy from the product name only, leave "specs" empty and say so in "notes".
- If the source is about a different model or variant than the product name, say so in "notes".
- Arabic: Modern Standard Arabic that reads naturally in Kuwait, with the words customers use (كاميرا مراقبة، رؤية ليلية، راوتر، مقوي، ميش). Brand and model names stay in Latin script.
- No prices, no warranty promises unless the source states them, no "best in Kuwait", no emojis.
- Description: what it is, who it is for (homes, villas, shops, offices), what the key technologies do in plain words, and what else is needed with it.
- FAQ: 3-5 questions buyers really ask, answered from the facts only.
- specs: only keys from SPEC_FIELDS. number = a number without unit; select = one option value; multiselect = array of option values; boolean = true/false; text = short string, or {"ar": "...", "en": "..."} when it needs translating.
- Add-ons and questions: think like a good salesperson. Suggest add-on groups from ADDON_GROUPS that fit (memory card for a camera, installation, extended warranty, cables), and write short questions the store owner must answer before publishing (bundles, installation service, accessories in the box, colors or sizes to sell, stock).

Answer with ONE JSON object and nothing else.`

const OUTPUT = `{
  "title_ar": "<= 90 chars: type + key spec + brand + model",
  "title_en": "...",
  "subtitle_ar": "<= 110 chars, the main benefit",
  "subtitle_en": "...",
  "description_ar": "120-220 words, paragraphs separated by \\n\\n",
  "description_en": "100-180 words",
  "highlights_ar": ["4-6 short bullets"],
  "highlights_en": ["..."],
  "specs": { "<key from SPEC_FIELDS>": "<value>" },
  "missing_specs": ["<keys not found in the source>"],
  "faq": [{ "question_ar": "", "answer_ar": "", "question_en": "", "answer_en": "" }],
  "seo_title_ar": "<= 60 chars, includes the model",
  "seo_title_en": "<= 60 chars",
  "seo_description_ar": "120-155 chars",
  "seo_description_en": "120-155 chars",
  "handle": "latin-lowercase-words-with-dashes",
  "mpn": "official model number or null",
  "warranty_months": null,
  "category_id": "<one id from CATEGORIES or null>",
  "brand": "<brand name>",
  "addon_group_ids": ["<ids from ADDON_GROUPS that fit>"],
  "variants": null,
  "questions": [{ "question_ar": "", "suggestion_ar": "" }],
  "notes": "data issues and uncertainties, in Arabic"
}
"variants" is null, or {"option_ar": "اللون", "option_en": "Color", "values": ["..."]} only when the source shows the same product sold in several colors or sizes.`

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const strList = (v: unknown, maxItems: number, max: number) =>
  Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, maxItems) : []
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

export async function draftProduct(container: MedusaContainer, input: DraftInput) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query
  const catalog = container.resolve<CatalogModuleService>(CATALOG_MODULE)

  const page = input.source_url ? await fetchPage(input.source_url) : null
  const sourceText = [page ? `Page: ${page.url}\nTitle: ${page.title}\n\n${page.text}` : "", input.source_text?.trim() ?? ""]
    .filter(Boolean)
    .join("\n\n---\n\n")
    .slice(0, 80_000)

  const [{ data: categories }, brands, addonGroups] = await Promise.all([
    query.graph({ entity: "product_category", fields: ["id", "name", "handle", "parent_category_id"], pagination: { take: 400 } }),
    catalog.listBrands({}, { take: 500 }),
    catalog.listAddonGroups({}, { take: 200 }),
  ])
  const categoryRows = categories as { id: string; name: string; handle: string }[]

  // Spec fields of the chosen category (or, after the model picks one, of that one).
  const fieldsOf = async (categoryId: string | null) =>
    categoryId ? ((await attributesByCategory(query, [categoryId])).get(categoryId) ?? []) : []
  let categoryId = categoryRows.some((c) => c.id === input.category_id) ? (input.category_id as string) : null
  let attributes: SpecAttribute[] = await fieldsOf(categoryId)

  const prompt = (attrs: SpecAttribute[]) =>
    [
      `PRODUCT: ${input.name}`,
      input.brand ? `BRAND: ${input.brand}` : "",
      input.notes ? `STORE NOTES: ${input.notes}` : "",
      `CATEGORIES (id: name): ${categoryRows.map((c) => `${c.id}: ${c.name}`).join(" | ")}`,
      categoryId ? `CHOSEN CATEGORY: ${categoryId}` : "Pick the best category_id from CATEGORIES.",
      `SPEC_FIELDS: ${JSON.stringify(
        attrs.map((a) => ({ key: a.key, label: a.label_en, type: a.type, unit: a.unit ?? undefined, options: a.options?.map((o) => o.value) }))
      )}`,
      `ADDON_GROUPS: ${JSON.stringify(addonGroups.map((g) => ({ id: g.id, name: g.name_ar, kind: g.kind })))}`,
      `KNOWN BRANDS: ${brands.map((b) => b.name).join(", ")}`,
      `SOURCE:\n${sourceText || "(none given)"}`,
      `Return JSON shaped like:\n${OUTPUT}`,
    ]
      .filter(Boolean)
      .join("\n\n")

  const runId = newRunId()
  let out = parseJsonObject(await aiText(container, SYSTEM, prompt(attributes), { task: "product_draft", runId }))

  // The model chose the category: write the specs again with that category's fields.
  const suggested = str(out.category_id, 100)
  if (!categoryId && categoryRows.some((c) => c.id === suggested)) {
    categoryId = suggested
    attributes = await fieldsOf(categoryId)
    if (attributes.length && sourceText) {
      out = parseJsonObject(await aiText(container, SYSTEM, prompt(attributes), { task: "product_draft", runId }))
    }
  }

  const notes: string[] = []
  const { specs, errors } = validateSpecs(attributes, (out.specs && typeof out.specs === "object" ? out.specs : {}) as Record<string, unknown>)
  if (errors.length) notes.push(`مواصفات اتشالت لأنها مش مطابقة للقسم: ${errors.join("؛ ")}`)
  if (!sourceText) notes.push("مفيش مصدر رسمي: المواصفات فاضية والوصف عام. ضيف رابط صفحة الشركة أو الصق المواصفات.")
  const note = str(out.notes, 2000)
  if (note) notes.push(note)

  const brandName = str(out.brand, 80) || input.brand || ""
  const brand = brands.find((b) => b.name.toLowerCase() === brandName.toLowerCase()) ?? null
  const groupIds = new Set(addonGroups.map((g) => g.id))
  const variants = out.variants as { option_ar?: unknown; option_en?: unknown; values?: unknown } | null

  return {
    source: page ? { url: page.url, title: page.title } : null,
    images: page?.images ?? [],
    category_id: categoryId,
    brand: brand ? { id: brand.id, name: brand.name } : null,
    brand_suggested: brand ? null : brandName || null,
    spec_fields: attributes,
    content: {
      title_ar: str(out.title_ar, 200) || input.name,
      title_en: str(out.title_en, 300),
      subtitle_ar: str(out.subtitle_ar, 300),
      subtitle_en: str(out.subtitle_en, 300),
      description_ar: str(out.description_ar, 20000),
      description_en: str(out.description_en, 20000),
      highlights_ar: strList(out.highlights_ar, 12, 300),
      highlights_en: strList(out.highlights_en, 12, 300),
      faq: (Array.isArray(out.faq) ? out.faq : [])
        .map((f) => f as Record<string, unknown>)
        .map((f) => ({
          question_ar: str(f.question_ar, 300),
          answer_ar: str(f.answer_ar, 2000),
          question_en: str(f.question_en, 300),
          answer_en: str(f.answer_en, 2000),
        }))
        .filter((f) => f.question_ar && f.answer_ar && f.question_en && f.answer_en)
        .slice(0, 20),
      seo_title_ar: str(out.seo_title_ar, 70),
      seo_title_en: str(out.seo_title_en, 70),
      seo_description_ar: str(out.seo_description_ar, 170),
      seo_description_en: str(out.seo_description_en, 170),
      mpn: str(out.mpn, 80) || null,
      warranty_months:
        typeof out.warranty_months === "number" && out.warranty_months >= 0 && out.warranty_months <= 120 ? Math.round(out.warranty_months) : null,
    },
    handle: slugify(str(out.handle, 120) || input.name) || `product-${Date.now()}`,
    specs,
    missing_specs: strList(out.missing_specs, 80, 60),
    addon_group_ids: strList(out.addon_group_ids, 20, 100).filter((id) => groupIds.has(id)),
    variants:
      variants && Array.isArray(variants.values) && variants.values.length > 1
        ? { option_ar: str(variants.option_ar, 60) || "النوع", option_en: str(variants.option_en, 60) || "Type", values: strList(variants.values, 20, 60) }
        : null,
    questions: (Array.isArray(out.questions) ? out.questions : [])
      .map((q) => q as Record<string, unknown>)
      .map((q) => ({ question_ar: str(q.question_ar, 300), suggestion_ar: str(q.suggestion_ar, 300) }))
      .filter((q) => q.question_ar)
      .slice(0, 8),
    price_kwd: input.price_kwd ?? null,
    notes,
  }
}

export type ProductDraft = Awaited<ReturnType<typeof draftProduct>>

