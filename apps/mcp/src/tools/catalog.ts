import type { McpServer } from "@modelcontextprotocol/server"
import * as z from "zod/v4"

import { api, CURRENCY, kwd } from "../api.js"
import { ok, respond } from "../respond.js"

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
const CREATE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
const DELETE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }

const format = z.enum(["markdown", "json"]).default("markdown").describe("'markdown' to read, 'json' for structured data")

type Price = { id: string; amount: number; currency_code: string }
type Variant = { id: string; title: string; sku: string | null; prices?: Price[] }
type Product = {
  id: string
  title: string
  handle: string
  status: string
  description: string | null
  metadata: Record<string, unknown> | null
  variants?: Variant[]
  categories?: { name: string }[]
}
type PriceList = {
  id: string
  title: string
  description: string | null
  status: string
  type: string
  starts_at: string | null
  ends_at: string | null
  prices?: { variant_id?: string; amount: number; currency_code: string }[]
}

const PRODUCT_FIELDS = "id,title,handle,status,description,metadata,*variants,*variants.prices,*categories"

const basePrice = (v: Variant) => v.prices?.find((p) => p.currency_code === CURRENCY)

async function findProduct(ref: string, signal: AbortSignal): Promise<Product> {
  const query = ref.startsWith("prod_") ? { id: ref } : { handle: ref }
  const { products } = await api<{ products: Product[] }>("/admin/products", {
    query: { ...query, fields: PRODUCT_FIELDS, limit: 1 },
    signal,
  })
  if (!products[0]) {
    throw new Error(`No product with ${ref.startsWith("prod_") ? "id" : "handle"} "${ref}". Use laly_search_products to find it.`)
  }
  return products[0]
}

const productLine = (p: Product) => {
  const prices = (p.variants ?? []).map((v) => `${v.sku ?? v.title}: ${kwd(basePrice(v)?.amount)}`).join(", ")
  const brand = typeof p.metadata?.brand === "string" ? ` · ${p.metadata.brand}` : ""
  return `- **${p.title}**${brand} — handle \`${p.handle}\` (${p.id}) — ${p.status} — ${prices}`
}

const offerState = (o: PriceList, now = Date.now()) => {
  if (o.status !== "active") return o.status
  if (o.starts_at && Date.parse(o.starts_at) > now) return "scheduled"
  if (o.ends_at && Date.parse(o.ends_at) <= now) return "ended"
  return "running"
}

export function registerCatalogTools(server: McpServer) {
  server.registerTool(
    "laly_search_products",
    {
      title: "Search products",
      description:
        "Search the catalogue by text (Arabic or English, title/handle/SKU) and get each product's handle, id, status, brand and regular KWD price per variant. Use the handle or id in other tools. Example: 'cameras by Hikvision' -> q='Hikvision'.",
      inputSchema: z.strictObject({
        q: z.string().trim().max(200).optional().describe("Search text; omit to list everything"),
        limit: z.number().int().min(1).max(50).default(20).describe("Products per page"),
        offset: z.number().int().min(0).default(0).describe("Products to skip, for pagination"),
        response_format: format,
      }),
      annotations: READ,
    },
    async ({ q, limit, offset, response_format }, ctx) => {
      const { products, count } = await api<{ products: Product[]; count: number }>("/admin/products", {
        query: { q, limit, offset, fields: PRODUCT_FIELDS, order: "title" },
        signal: ctx.mcpReq.signal,
      })
      const next = offset + products.length
      const page = { total: count, count: products.length, offset, products, has_more: count > next, ...(count > next ? { next_offset: next } : {}) }
      return respond(page, response_format, () =>
        products.length
          ? [`# Products (${products.length} of ${count})`, ...products.map(productLine), ...(count > next ? ["", `More: call again with offset=${next}.`] : [])].join("\n")
          : `No products match "${q ?? ""}". Try a shorter or different word.`
      )
    }
  )

  server.registerTool(
    "laly_update_product",
    {
      title: "Update product",
      description:
        "Edit a product's Arabic title/description, English title/description, brand, or status (published/draft). Only passed fields change; other metadata is kept. Use it to write or improve product copy.",
      inputSchema: z.strictObject({
        product: z.string().min(1).describe("Product handle (e.g. 'tapo-c200') or id (prod_...)"),
        title: z.string().trim().min(1).max(200).optional().describe("Arabic title shown on the storefront"),
        description: z.string().trim().max(5000).optional().describe("Arabic description"),
        en_title: z.string().trim().max(200).optional().describe("English title (for the English feed/site)"),
        en_description: z.string().trim().max(5000).optional().describe("English description"),
        brand: z.string().trim().max(80).optional().describe("Brand, e.g. 'Hikvision'"),
        status: z.enum(["published", "draft"]).optional().describe("draft hides it from the store"),
      }),
      annotations: WRITE,
    },
    async ({ product: ref, title, description, en_title, en_description, brand, status }, ctx) => {
      const signal = ctx.mcpReq.signal
      const product = await findProduct(ref, signal)
      const metaChanges = Object.fromEntries(
        Object.entries({ en_title, en_description, brand }).filter(([, v]) => v !== undefined)
      )
      const body = {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(Object.keys(metaChanges).length ? { metadata: { ...(product.metadata ?? {}), ...metaChanges } } : {}),
      }
      if (!Object.keys(body).length) throw new Error("Pass at least one field to change.")
      const { product: updated } = await api<{ product: Product }>(`/admin/products/${product.id}`, {
        method: "POST",
        body,
        signal,
      })
      return ok(`Updated ${updated.title} (${updated.handle}).`)
    }
  )

  server.registerTool(
    "laly_set_price",
    {
      title: "Set regular price",
      description:
        "Set a product's regular price in KWD (not a temporary sale; use laly_create_offer for sales). For multi-variant products pass the variant SKU. Example: 'make the Archer C6 router 11.900' -> product='tp-link-archer-c6', amount=11.9.",
      inputSchema: z.strictObject({
        product: z.string().min(1).describe("Product handle or id"),
        variant_sku: z.string().optional().describe("Required only when the product has several variants"),
        amount: z.number().positive().max(100_000).describe("New regular price in KWD, e.g. 12.9 for 12.900 KWD"),
      }),
      annotations: WRITE,
    },
    async ({ product: ref, variant_sku, amount }, ctx) => {
      const signal = ctx.mcpReq.signal
      const product = await findProduct(ref, signal)
      const variants = product.variants ?? []
      const variant = variant_sku ? variants.find((v) => v.sku === variant_sku) : variants.length === 1 ? variants[0] : undefined
      if (!variant) {
        throw new Error(`Pick a variant with variant_sku. Options: ${variants.map((v) => v.sku ?? v.id).join(", ")}`)
      }
      const existing = basePrice(variant)
      const prices = [
        ...(variant.prices ?? []).filter((p) => p.currency_code !== CURRENCY).map((p) => ({ id: p.id, amount: p.amount, currency_code: p.currency_code })),
        { ...(existing ? { id: existing.id } : {}), amount, currency_code: CURRENCY },
      ]
      await api(`/admin/products/${product.id}/variants/${variant.id}`, { method: "POST", body: { prices }, signal })
      return ok(`${product.title}: regular price ${kwd(existing?.amount)} → ${kwd(amount)}.`)
    }
  )

  server.registerTool(
    "laly_list_offers",
    {
      title: "List offers",
      description:
        "List sale offers (Medusa price lists) with state (running/scheduled/ended/draft), dates, and number of discounted prices. Running offers drive the storefront deals section and countdowns.",
      inputSchema: z.strictObject({
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
        response_format: format,
      }),
      annotations: READ,
    },
    async ({ limit, offset, response_format }, ctx) => {
      const { price_lists, count } = await api<{ price_lists: PriceList[]; count: number }>("/admin/price-lists", {
        query: { limit, offset, order: "-created_at" },
        signal: ctx.mcpReq.signal,
      })
      const offers = price_lists.map((o) => ({ ...o, state: offerState(o), price_count: o.prices?.length ?? 0, prices: undefined }))
      const next = offset + offers.length
      return respond({ total: count, offset, offers, has_more: count > next }, response_format, () =>
        offers.length
          ? [
              `# Offers (${offers.length} of ${count})`,
              ...offers.map(
                (o) => `- **${o.title}** (${o.id}) — ${o.state} — ${o.starts_at ?? "now"} → ${o.ends_at ?? "no end date"} — ${o.price_count} prices`
              ),
            ].join("\n")
          : "No offers yet. Create one with laly_create_offer."
      )
    }
  )

  server.registerTool(
    "laly_create_offer",
    {
      title: "Create offer",
      description:
        "Put products on sale for a period. For each product give either sale_price (KWD) or discount_percent. Medusa applies the sale prices between starts_at and ends_at and removes them automatically after ends_at; the storefront shows a real countdown to ends_at. Example: '20% off Hikvision cameras until Friday' -> search products first, then items=[{product:'hikvision-4mp-dome', discount_percent:20}, ...], ends_at='2026-10-23T23:59:00+03:00'.",
      inputSchema: z.strictObject({
        title: z.string().trim().min(1).max(120).describe("Offer name shown on the storefront, Arabic, e.g. 'عروض نهاية الأسبوع'"),
        description: z.string().trim().max(300).optional().describe("Short Arabic line shown above the offer"),
        starts_at: z.iso.datetime({ offset: true }).optional().describe("Start, ISO 8601 with offset (Kuwait +03:00). Omit to start now."),
        ends_at: z.iso.datetime({ offset: true }).describe("End, ISO 8601 with offset. Required so countdowns are real."),
        items: z
          .array(
            z.strictObject({
              product: z.string().min(1).describe("Product handle or id"),
              sale_price: z.number().positive().optional().describe("Sale price in KWD"),
              discount_percent: z.number().min(1).max(90).optional().describe("Percent off the regular price"),
            })
          )
          .min(1)
          .max(100),
      }),
      annotations: CREATE,
    },
    async ({ title, description, starts_at, ends_at, items }, ctx) => {
      const signal = ctx.mcpReq.signal
      if (starts_at && Date.parse(ends_at) <= Date.parse(starts_at)) throw new Error("ends_at must be after starts_at.")
      if (Date.parse(ends_at) <= Date.now()) throw new Error("ends_at is in the past.")

      const prices: { variant_id: string; amount: number; currency_code: string }[] = []
      const summary: string[] = []
      for (const item of items) {
        if ((item.sale_price === undefined) === (item.discount_percent === undefined)) {
          throw new Error(`${item.product}: give exactly one of sale_price or discount_percent.`)
        }
        const product = await findProduct(item.product, signal)
        for (const variant of product.variants ?? []) {
          const regular = basePrice(variant)?.amount
          if (!regular) throw new Error(`${product.title} has no KWD price; set one with laly_set_price first.`)
          const amount =
            item.sale_price ?? Math.round(regular * (1 - (item.discount_percent ?? 0) / 100) * 1000) / 1000
          if (amount >= regular) throw new Error(`${product.title}: sale price ${kwd(amount)} is not below the regular ${kwd(regular)}.`)
          prices.push({ variant_id: variant.id, amount, currency_code: CURRENCY })
          summary.push(`- ${product.title}${(product.variants?.length ?? 0) > 1 ? ` (${variant.sku ?? variant.title})` : ""}: ${kwd(regular)} → ${kwd(amount)}`)
        }
      }

      const { price_list } = await api<{ price_list: PriceList }>("/admin/price-lists", {
        method: "POST",
        body: {
          title,
          description: description ?? title,
          type: "sale",
          status: "active",
          starts_at: starts_at ?? new Date().toISOString(),
          ends_at,
          prices,
        },
        signal,
      })
      return ok(`Offer "${title}" created (${price_list.id}), ${starts_at ?? "now"} → ${ends_at}:\n${summary.join("\n")}`)
    }
  )

  server.registerTool(
    "laly_update_offer",
    {
      title: "Update offer",
      description:
        "Change an offer's title, description, dates, or pause it (status='draft') / resume it (status='active'). To end an offer now, set ends_at to the current time.",
      inputSchema: z.strictObject({
        id: z.string().startsWith("plist_").describe("Offer id from laly_list_offers"),
        title: z.string().trim().min(1).max(120).optional(),
        description: z.string().trim().max(300).optional(),
        starts_at: z.iso.datetime({ offset: true }).optional(),
        ends_at: z.iso.datetime({ offset: true }).optional(),
        status: z.enum(["active", "draft"]).optional(),
      }),
      annotations: WRITE,
    },
    async ({ id, ...changes }, ctx) => {
      if (!Object.keys(changes).length) throw new Error("Pass at least one field to change.")
      const { price_list } = await api<{ price_list: PriceList }>(`/admin/price-lists/${id}`, {
        method: "POST",
        body: changes,
        signal: ctx.mcpReq.signal,
      })
      return ok(`Offer ${price_list.title} is now ${offerState(price_list)} (${price_list.starts_at ?? "now"} → ${price_list.ends_at ?? "no end"}).`)
    }
  )

  server.registerTool(
    "laly_delete_offer",
    {
      title: "Delete offer",
      description: "Permanently delete an offer and its sale prices. To stop it but keep the record, use laly_update_offer with ends_at=now.",
      inputSchema: z.strictObject({ id: z.string().startsWith("plist_").describe("Offer id") }),
      annotations: DELETE,
    },
    async ({ id }, ctx) => {
      await api(`/admin/price-lists/${id}`, { method: "DELETE", signal: ctx.mcpReq.signal })
      return ok(`Offer ${id} deleted.`)
    }
  )
}
