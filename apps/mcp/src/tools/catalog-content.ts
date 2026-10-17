import type { McpServer } from "@modelcontextprotocol/server"
import * as z from "zod/v4"

import { api } from "../api.js"
import { ok, respond } from "../respond.js"

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }

const format = z.enum(["markdown", "json"]).default("markdown").describe("'markdown' to read, 'json' for structured data")

type SpecAttribute = {
  key: string
  label_ar: string
  label_en: string
  type: "text" | "number" | "boolean" | "select" | "multiselect"
  unit?: string | null
  options?: { value: string; label_ar: string; label_en: string }[]
  filterable?: boolean
}
type Catalog = {
  product_id: string
  detail: Record<string, unknown> | null
  brand: { id: string; name: string } | null
  addon_group_ids: string[]
  attributes: SpecAttribute[]
}

async function productId(ref: string, signal: AbortSignal): Promise<{ id: string; title: string }> {
  const query = ref.startsWith("prod_") ? { id: ref } : { handle: ref }
  const { products } = await api<{ products: { id: string; title: string }[] }>("/admin/products", {
    query: { ...query, fields: "id,title", limit: 1 },
    signal,
  })
  if (!products[0]) {
    throw new Error(`No product "${ref}". Use laly_search_products to find its handle.`)
  }
  return products[0]
}

const describeField = (a: SpecAttribute) => {
  const values =
    a.type === "select" || a.type === "multiselect"
      ? ` — ${a.type === "multiselect" ? "array of" : "one of"}: ${(a.options ?? []).map((o) => `\`${o.value}\` (${o.label_en})`).join(", ")}`
      : a.type === "number"
        ? ` — number${a.unit ? ` in ${a.unit}` : ""}`
        : a.type === "boolean"
          ? " — true/false"
          : " — short text, or {ar, en}"
  return `- \`${a.key}\` ${a.label_en} / ${a.label_ar}${a.filterable ? " [filter]" : ""}${values}`
}

const specValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.object({ ar: z.string(), en: z.string() }),
  z.null(),
])

const faq = z.array(
  z.strictObject({
    question_ar: z.string().min(1),
    answer_ar: z.string().min(1),
    question_en: z.string().min(1),
    answer_en: z.string().min(1),
  })
)

export function registerCatalogContentTools(server: McpServer) {
  server.registerTool(
    "laly_get_product_catalog",
    {
      title: "Get product specs and content",
      description:
        "Read a product's catalog data (brand, model number, specs, English copy, highlights, FAQ, SEO, price-on-request, add-ons) and the spec fields its categories define, with the allowed values. Call this before laly_update_product_catalog so every spec key and option value is valid.",
      inputSchema: z.strictObject({
        product: z.string().min(1).describe("Product handle or id (prod_...)"),
        response_format: format,
      }),
      annotations: READ,
    },
    async ({ product: ref, response_format }, ctx) => {
      const signal = ctx.mcpReq.signal
      const product = await productId(ref, signal)
      const { catalog } = await api<{ catalog: Catalog }>(`/admin/catalog/products/${product.id}`, { signal })
      return respond({ title: product.title, ...catalog }, response_format, () =>
        [
          `# ${product.title}`,
          `Brand: ${catalog.brand?.name ?? "none"} · Model: ${String(catalog.detail?.mpn ?? "—")} · Price on request: ${catalog.detail?.price_on_request ? "yes" : "no"}`,
          "",
          "## Current specs",
          "```json",
          JSON.stringify(catalog.detail?.specs ?? {}, null, 2),
          "```",
          "",
          "## Spec fields for this product's categories",
          catalog.attributes.length
            ? catalog.attributes.map(describeField).join("\n")
            : "None: the product has no category with a spec template.",
        ].join("\n")
      )
    }
  )

  server.registerTool(
    "laly_update_product_catalog",
    {
      title: "Update product specs and content",
      description:
        "Write a product's specs, English copy, highlights, FAQ, SEO texts, model number, brand, price-on-request flag or add-on groups. Only passed fields change. Specs are validated against the category templates (unknown keys or values are rejected with the reason). Use official manufacturer sources for specs; never guess numbers. Arabic title/description go through laly_update_product.",
      inputSchema: z.strictObject({
        product: z.string().min(1).describe("Product handle or id"),
        brand: z.string().optional().describe("Brand name as listed in the store (e.g. 'Hikvision'), or '' to clear"),
        specs: z.record(z.string(), specValue).optional().describe("Full spec map {key: value}; replaces the current specs"),
        title_en: z.string().max(300).optional(),
        subtitle_ar: z.string().max(300).optional(),
        subtitle_en: z.string().max(300).optional(),
        description_en: z.string().max(20000).optional(),
        highlights_ar: z.array(z.string().max(300)).max(12).optional(),
        highlights_en: z.array(z.string().max(300)).max(12).optional(),
        faq: faq.max(20).optional(),
        seo_title_ar: z.string().max(70).optional(),
        seo_title_en: z.string().max(70).optional(),
        seo_description_ar: z.string().max(170).optional(),
        seo_description_en: z.string().max(170).optional(),
        mpn: z.string().max(80).optional().describe("Manufacturer model number"),
        series: z.string().max(80).optional(),
        price_on_request: z.boolean().optional().describe("true shows 'request a quote' instead of add-to-cart"),
        warranty_months: z.number().int().min(0).max(120).optional(),
        source_url: z.string().url().startsWith("https://").optional().describe("Official page the specs came from"),
        addon_group_ids: z.array(z.string()).optional().describe("Add-on groups offered with this product (replaces the list)"),
      }),
      annotations: WRITE,
    },
    async ({ product: ref, brand, addon_group_ids, ...detail }, ctx) => {
      const signal = ctx.mcpReq.signal
      const product = await productId(ref, signal)
      let brand_id: string | null | undefined
      if (brand !== undefined) {
        if (brand === "") {
          brand_id = null
        } else {
          const { brands } = await api<{ brands: { id: string; name: string }[] }>("/admin/catalog/brands", { signal })
          const match = brands.find((b) => b.name.toLowerCase() === brand.toLowerCase())
          if (!match) {
            throw new Error(`Unknown brand "${brand}". Known brands: ${brands.map((b) => b.name).join(", ")}`)
          }
          brand_id = match.id
        }
      }
      const body = {
        ...(Object.keys(detail).length ? { detail } : {}),
        ...(brand_id !== undefined ? { brand_id } : {}),
        ...(addon_group_ids ? { addon_group_ids } : {}),
      }
      if (!Object.keys(body).length) throw new Error("Pass at least one field to change.")
      await api(`/admin/catalog/products/${product.id}`, { method: "POST", body, signal })
      return ok(`Updated catalog data of ${product.title}.`)
    }
  )

  server.registerTool(
    "laly_list_quote_requests",
    {
      title: "List quote requests",
      description:
        "Customers' price requests for price-on-request products, newest first, with phone numbers and quantities. Filter by status: new, contacted, quoted, won, lost.",
      inputSchema: z.strictObject({
        status: z.enum(["new", "contacted", "quoted", "won", "lost"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        response_format: format,
      }),
      annotations: READ,
    },
    async ({ status, limit, response_format }, ctx) => {
      const data = await api<{
        quote_requests: {
          id: string
          created_at: string
          product_title: string
          customer_name: string
          phone: string
          quantity: number
          message: string | null
          status: string
        }[]
        count: number
      }>("/admin/catalog/quote-requests", {
        query: { ...(status ? { status } : {}), limit },
        signal: ctx.mcpReq.signal,
      })
      return respond(data, response_format, () =>
        data.quote_requests.length
          ? [
              `${data.count} request(s)${status ? ` with status ${status}` : ""}:`,
              ...data.quote_requests.map(
                (q) =>
                  `- ${q.created_at.slice(0, 16).replace("T", " ")} · **${q.product_title}** × ${q.quantity} · ${q.customer_name} ${q.phone} · ${q.status}${q.message ? ` · "${q.message}"` : ""} (${q.id})`
              ),
            ].join("\n")
          : "No quote requests."
      )
    }
  )
}
