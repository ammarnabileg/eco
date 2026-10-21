import { createHmac, timingSafeEqual } from "node:crypto"

import { MedusaContainer } from "@medusajs/framework/types"
import { z } from "@medusajs/framework/zod"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { updateProductsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

import { settingsKey } from "../../modules/integrations/store"
import { WHATSAPP_MODULE } from "../../modules/whatsapp"
import WhatsAppModuleService from "../../modules/whatsapp/service"

// Tools of the admin assistant. Read tools run at once. Write tools only
// prepare a signed action that the admin must confirm in the UI; nothing in
// the store changes until then.

type Query = { graph: (q: Record<string, unknown>) => Promise<{ data: unknown[] }> }
const queryOf = (c: MedusaContainer) => c.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query

const KWD = "kwd"
const kwd = (n: number | null | undefined) => (n == null ? "—" : `${Number(n).toFixed(3)} KWD`)

type Variant = { id: string; sku?: string | null; title?: string | null; prices?: { id: string; amount: number; currency_code: string }[] }
type Product = { id: string; title: string; handle: string; status: string; subtitle?: string | null; description?: string | null; variants?: Variant[] }

const PRODUCT_FIELDS = [
  "id",
  "title",
  "subtitle",
  "handle",
  "status",
  "variants.id",
  "variants.sku",
  "variants.title",
  "variants.prices.id",
  "variants.prices.amount",
  "variants.prices.currency_code",
]

const priceOf = (v: Variant) => v.prices?.find((p) => p.currency_code === KWD) ?? null
// Only what the model needs to answer or propose a change; one-variant
// products carry no variant title.
const productLine = (p: Product) => ({
  id: p.id,
  title: p.title,
  status: p.status,
  variants: (p.variants ?? []).map((v) => ({
    id: v.id,
    ...(v.sku ? { sku: v.sku } : {}),
    ...(v.title && !/^default/i.test(v.title) ? { title: v.title } : {}),
    price_kwd: priceOf(v)?.amount ?? null,
  })),
})

async function findProduct(container: MedusaContainer, ref: string): Promise<Product> {
  const { data } = await queryOf(container).graph({
    entity: "product",
    fields: [...PRODUCT_FIELDS, "description"],
    filters: ref.startsWith("prod_") ? { id: ref } : { handle: ref },
  })
  const product = data[0] as Product | undefined
  if (!product) throw new MedusaError(MedusaError.Types.NOT_FOUND, `No product "${ref}". Search first and use its id.`)
  return product
}

async function findVariant(container: MedusaContainer, variantId: string) {
  const { data } = await queryOf(container).graph({
    entity: "product_variant",
    fields: ["id", "sku", "title", "product.id", "product.title", "prices.id", "prices.amount", "prices.currency_code"],
    filters: { id: variantId },
  })
  const variant = data[0] as (Variant & { product?: { id: string; title: string } }) | undefined
  if (!variant) throw new MedusaError(MedusaError.Types.NOT_FOUND, `No variant "${variantId}". Get it from search_products.`)
  return variant
}

// --- definitions ---------------------------------------------------------------

const schemas = {
  search_products: z.object({
    q: z.string().max(200).optional().describe("Text to search in titles, handles and SKUs (Arabic or English). Omit to list."),
    status: z.enum(["published", "draft"]).optional(),
    limit: z.number().int().min(1).max(30).default(15),
    offset: z.number().int().min(0).default(0),
  }),
  get_product: z.object({ product: z.string().min(1).describe("Product id (prod_...) or handle") }),
  list_orders: z.object({
    limit: z.number().int().min(1).max(30).default(10),
    days: z.number().int().min(1).max(365).optional().describe("Only orders from the last N days"),
  }),
  get_order: z.object({ order: z.string().min(1).describe("Order id (order_...) or its number, e.g. 1024") }),
  sales_summary: z.object({ days: z.number().int().min(1).max(365).default(30) }),
  whatsapp_inbox: z.object({ unread_only: z.boolean().default(true), limit: z.number().int().min(1).max(30).default(10) }),
  set_price: z.object({
    variant_id: z.string().startsWith("variant_"),
    price_kwd: z.number().positive().max(100_000).describe("New regular price in KWD, e.g. 12.9"),
  }),
  adjust_prices: z.object({
    product_ids: z.array(z.string().startsWith("prod_")).min(1).max(100),
    percent: z.number().min(-90).max(300).describe("Change in percent: 10 raises by 10%, -15 lowers by 15%"),
    round_to: z.number().positive().max(10).default(0.1).describe("Round results to this step in KWD (0.1 gives x.x00)"),
  }),
  update_product: z.object({
    product_id: z.string().startsWith("prod_"),
    title: z.string().trim().min(1).max(200).optional(),
    subtitle: z.string().trim().max(300).optional(),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(["published", "draft"]).optional().describe("draft hides the product from the store"),
  }),
}

export type ToolName = keyof typeof schemas

const DESCRIPTIONS: Record<ToolName, string> = {
  search_products: "Find products and their variants with ids, SKUs, status and regular KWD price. Use it before any change.",
  get_product: "One product with description, variants and KWD prices.",
  list_orders: "Recent orders, newest first: number, date, customer, total, payment and fulfillment status.",
  get_order: "One order with items, totals, statuses and delivery address.",
  sales_summary: "Orders, revenue, average order value and best-selling products over the last N days.",
  whatsapp_inbox: "Latest WhatsApp conversations with customers (unread first).",
  set_price:
    "Propose a new regular KWD price for one variant. Does not apply it: the admin confirms in the panel. Use adjust_prices for many products.",
  adjust_prices:
    "Propose raising or lowering the KWD price of every variant of several products by a percentage. Does not apply it: the admin confirms in the panel.",
  update_product:
    "Propose changing a product's title, subtitle, description or published/draft status. Only the passed fields change. Does not apply it: the admin confirms in the panel.",
}

export const WRITE_TOOLS = new Set<ToolName>(["set_price", "adjust_prices", "update_product"])

export const assistantTools = (Object.keys(schemas) as ToolName[]).map((name) => {
  const { $schema: _ignored, ...input_schema } = z.toJSONSchema(schemas[name], { io: "input" }) as Record<string, unknown>
  return { name, description: DESCRIPTIONS[name], input_schema: input_schema as { type: "object"; [k: string]: unknown } }
})

// --- read tools --------------------------------------------------------------

async function runRead(container: MedusaContainer, name: ToolName, raw: unknown): Promise<unknown> {
  const query = queryOf(container)
  switch (name) {
    case "search_products": {
      const i = schemas.search_products.parse(raw)
      const { data } = await query.graph({
        entity: "product",
        fields: PRODUCT_FIELDS,
        filters: { ...(i.q ? { q: i.q } : {}), ...(i.status ? { status: i.status } : {}) },
        pagination: { take: i.limit, skip: i.offset, order: { title: "ASC" } },
      })
      return { products: (data as Product[]).map(productLine) }
    }
    case "get_product": {
      const p = await findProduct(container, schemas.get_product.parse(raw).product)
      const description = p.description ?? null
      return {
        ...productLine(p),
        handle: p.handle,
        subtitle: p.subtitle ?? null,
        description: description && description.length > 800 ? `${description.slice(0, 800)}…` : description,
      }
    }
    case "list_orders": {
      const i = schemas.list_orders.parse(raw)
      const { data } = await query.graph({
        entity: "order",
        fields: ["id", "display_id", "created_at", "email", "total", "status", "payment_status", "fulfillment_status"],
        filters: i.days ? { created_at: { $gte: new Date(Date.now() - i.days * 864e5) } } : {},
        pagination: { take: i.limit, order: { created_at: "DESC" } },
      })
      return { orders: data }
    }
    case "get_order": {
      const ref = schemas.get_order.parse(raw).order.replace(/^#/, "")
      const { data } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "display_id",
          "created_at",
          "email",
          "status",
          "payment_status",
          "fulfillment_status",
          "total",
          "shipping_total",
          "items.title",
          "items.quantity",
          "items.unit_price",
          "shipping_address.*",
        ],
        filters: ref.startsWith("order_") ? { id: ref } : { display_id: Number(ref) },
      })
      if (!data[0]) throw new MedusaError(MedusaError.Types.NOT_FOUND, `No order "${ref}".`)
      return { order: data[0] }
    }
    case "sales_summary": {
      const { days } = schemas.sales_summary.parse(raw)
      const { data } = await query.graph({
        entity: "order",
        fields: ["id", "total", "status", "items.product_id", "items.title", "items.quantity"],
        filters: { created_at: { $gte: new Date(Date.now() - days * 864e5) } },
        pagination: { take: 2000 },
      })
      const orders = (data as { total: number; status: string; items?: { product_id?: string; title: string; quantity: number }[] }[]).filter(
        (o) => o.status !== "canceled"
      )
      const revenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0)
      const units = new Map<string, { title: string; units: number }>()
      for (const o of orders) {
        for (const it of o.items ?? []) {
          const k = it.product_id ?? it.title
          units.set(k, { title: it.title, units: (units.get(k)?.units ?? 0) + Number(it.quantity) })
        }
      }
      return {
        days,
        orders: orders.length,
        revenue_kwd: Number(revenue.toFixed(3)),
        average_order_kwd: orders.length ? Number((revenue / orders.length).toFixed(3)) : 0,
        top_products: [...units.entries()].sort((a, b) => b[1].units - a[1].units).slice(0, 10).map(([id, v]) => ({ id, ...v })),
        note: orders.length >= 2000 ? "Only the latest 2000 orders were counted." : undefined,
      }
    }
    case "whatsapp_inbox": {
      const i = schemas.whatsapp_inbox.parse(raw)
      const wa = container.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)
      const conversations = await wa.listWaConversations(i.unread_only ? { unread: { $gt: 0 } } : {}, {
        take: i.limit,
        order: { last_message_at: "DESC" },
      })
      return {
        conversations: conversations.map((c) => ({
          phone: c.phone,
          name: c.name,
          unread: c.unread,
          last_message_at: c.last_message_at,
          last_message: c.last_preview,
        })),
      }
    }
    default:
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Unknown tool ${name}`)
  }
}

// --- write tools: proposals and their execution --------------------------------

// A proposal records the values it was made against (`expected_*`) and when
// it expires; both are signed with it, so execution can refuse a stale or
// altered change. Running an applied proposal again is refused as stale.
export const PROPOSAL_TTL_MS = 30 * 60 * 1000

export type Action = { tool: ToolName; input: Record<string, unknown>; summary: string; expires_at: string; signature: string }

const sign = (tool: string, input: unknown, summary: string, expiresAt: string) =>
  createHmac("sha256", settingsKey()).update(JSON.stringify([tool, input, summary, expiresAt])).digest("hex")

export function verifyAction(a: { tool: string; input: unknown; summary: string; expires_at?: string; signature: string }) {
  const expected = Buffer.from(sign(a.tool, a.input, a.summary, String(a.expires_at ?? "")))
  const got = Buffer.from(String(a.signature))
  return WRITE_TOOLS.has(a.tool as ToolName) && expected.length === got.length && timingSafeEqual(expected, got)
}

const roundTo = (n: number, step: number) => Number((Math.round(n / step) * step).toFixed(3))

/** Checks a proposed change against current data and describes it. */
async function propose(container: MedusaContainer, name: ToolName, raw: unknown): Promise<Action> {
  let input: Record<string, unknown>
  let summary: string
  if (name === "set_price") {
    const i = schemas.set_price.parse(raw)
    const v = await findVariant(container, i.variant_id)
    input = { variant_id: v.id, price_kwd: Number(i.price_kwd.toFixed(3)), expected_kwd: priceOf(v)?.amount ?? null }
    summary = `${v.product?.title ?? ""}${v.sku ? ` (${v.sku})` : ""}: السعر ${kwd(priceOf(v)?.amount)} ← ${kwd(i.price_kwd)}`
  } else if (name === "adjust_prices") {
    const i = schemas.adjust_prices.parse(raw)
    const { data } = await queryOf(container).graph({ entity: "product", fields: PRODUCT_FIELDS, filters: { id: i.product_ids } })
    const products = data as Product[]
    if (!products.length) throw new MedusaError(MedusaError.Types.NOT_FOUND, "None of these products exist.")
    const changes = products.flatMap((p) =>
      (p.variants ?? [])
        .filter((v) => priceOf(v))
        .map((v) => {
          const from = Number(priceOf(v)!.amount)
          return { variant_id: v.id, label: `${p.title}${v.sku ? ` (${v.sku})` : ""}`, from, to: roundTo(from * (1 + i.percent / 100), i.round_to) }
        })
    )
    if (!changes.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "These products have no KWD prices to change.")
    input = { changes: changes.map(({ variant_id, to, from }) => ({ variant_id, price_kwd: to, expected_kwd: from })) }
    summary = [
      `تعديل الأسعار ${i.percent > 0 ? "+" : ""}${i.percent}% على ${changes.length} صنف:`,
      ...changes.slice(0, 15).map((c) => `• ${c.label}: ${kwd(c.from)} ← ${kwd(c.to)}`),
      ...(changes.length > 15 ? [`• و${changes.length - 15} صنف آخر`] : []),
    ].join("\n")
  } else {
    const i = schemas.update_product.parse(raw)
    const p = await findProduct(container, i.product_id)
    const { product_id: _id, ...fields } = i
    if (!Object.keys(fields).length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Pass at least one field to change.")
    const current = p as unknown as Record<string, unknown>
    input = { product_id: p.id, ...fields, expected: Object.fromEntries(Object.keys(fields).map((k) => [k, current[k] ?? null])) }
    const labels: Record<string, string> = { title: "الاسم", subtitle: "العنوان الفرعي", description: "الوصف", status: "الحالة" }
    summary = [
      `تعديل المنتج: ${p.title}`,
      ...Object.entries(fields).map(([k, v]) =>
        k === "status" ? `• الحالة: ${p.status} ← ${v}` : `• ${labels[k]}: ${String(v).slice(0, 120)}${String(v).length > 120 ? "…" : ""}`
      ),
    ].join("\n")
  }
  const expiresAt = new Date(Date.now() + PROPOSAL_TTL_MS).toISOString()
  return { tool: name, input, summary, expires_at: expiresAt, signature: sign(name, input, summary, expiresAt) }
}

/** Applies a confirmed action through Medusa's own workflows. */
export async function executeAction(container: MedusaContainer, action: Action): Promise<string> {
  if (!verifyAction(action)) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This action was changed or is not allowed.")
  if (!(Date.parse(action.expires_at) > Date.now())) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "الاقتراح ده انتهت صلاحيته (30 دقيقة). اطلبه تاني من المساعد.")
  }
  const setPrices = async (changes: { variant_id: string; price_kwd: number; expected_kwd: number | null }[]) => {
    const variants = await Promise.all(changes.map((c) => findVariant(container, c.variant_id)))
    // All or nothing: one changed price makes the whole proposal stale.
    const stale = variants.filter((v, idx) => {
      const now = priceOf(v)?.amount ?? null
      const was = changes[idx].expected_kwd
      return now === null || was === null ? now !== was : Math.abs(Number(now) - Number(was)) > 0.0005
    })
    if (stale.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `السعر اتغيّر من وقت الاقتراح في ${stale.length} صنف (${stale
          .slice(0, 5)
          .map((v) => v.sku ?? v.product?.title ?? v.id)
          .join("، ")}). ما اتنفذش أي تعديل؛ اطلب الاقتراح تاني.`
      )
    }
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: variants.map((v, idx) => {
          const current = priceOf(v)
          return {
            id: v.id,
            prices: [
              ...(v.prices ?? [])
                .filter((p) => p.currency_code !== KWD)
                .map((p) => ({ id: p.id, amount: p.amount, currency_code: p.currency_code })),
              { ...(current ? { id: current.id } : {}), amount: changes[idx].price_kwd, currency_code: KWD },
            ],
          }
        }),
      },
    })
    return variants.length
  }

  if (action.tool === "set_price") {
    const i = action.input as { variant_id: string; price_kwd: number; expected_kwd: number | null }
    await setPrices([i])
    return "تم تعديل السعر."
  }
  if (action.tool === "adjust_prices") {
    const n = await setPrices((action.input as { changes: { variant_id: string; price_kwd: number; expected_kwd: number | null }[] }).changes)
    return `تم تعديل أسعار ${n} صنف.`
  }
  const { product_id, expected, ...update } = action.input as { product_id: string; expected: Record<string, unknown> } & Record<string, string>
  const now = (await findProduct(container, product_id)) as unknown as Record<string, unknown>
  const changed = Object.keys(expected ?? {}).filter((k) => (now[k] ?? null) !== expected[k])
  if (changed.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `المنتج اتعدّل من وقت الاقتراح (${changed.join("، ")}). ما اتنفذش التعديل؛ اطلب الاقتراح تاني.`
    )
  }
  await updateProductsWorkflow(container).run({ input: { selector: { id: product_id }, update } })
  return "تم تعديل المنتج."
}

/** Runs one tool call from the model: a read result, or a proposal. */
export async function runTool(container: MedusaContainer, name: string, input: unknown) {
  if (!(name in schemas)) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Unknown tool ${name}`)
  const tool = name as ToolName
  if (WRITE_TOOLS.has(tool)) {
    const action = await propose(container, tool, input)
    return {
      action,
      result: {
        status: "awaiting_confirmation",
        summary: action.summary,
        note: "Not applied. The admin sees this as a button and must press it to apply.",
      },
    }
  }
  return { action: null, result: await runRead(container, tool, input) }
}
