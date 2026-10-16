import type { McpServer } from "@modelcontextprotocol/server"
import * as z from "zod/v4"

import { api } from "../api.js"
import { ok, respond } from "../respond.js"

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
const CREATE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
const DELETE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }

const format = z.enum(["markdown", "json"]).default("markdown").describe("'markdown' to read, 'json' for structured data")
const text = (max: number, what: string) => z.string().trim().max(max).nullish().describe(what)
const dateTime = (what: string) =>
  z.iso.datetime({ offset: true }).nullish().describe(`${what}, ISO 8601 with offset, e.g. 2026-11-01T00:00:00+03:00 (Kuwait is +03:00). null clears it.`)

type Settings = Record<string, string | null>
type Slide = Record<string, unknown> & { id: string; title_ar: string; rank: number; is_active: boolean }
type Badge = Record<string, unknown> & { id: string; title_ar: string; rank: number; is_active: boolean }

const slideFields = {
  title_ar: z.string().trim().min(1).max(200).describe("Main headline in Arabic, e.g. 'أمان ذكي'"),
  title_en: z.string().trim().min(1).max(200).describe("Main headline in English"),
  highlight_ar: text(200, "Second, highlighted line in Arabic (gold), e.g. 'لكل بيت في الكويت'"),
  highlight_en: text(200, "Highlighted line in English"),
  subtitle_ar: text(500, "Supporting sentence in Arabic"),
  subtitle_en: text(500, "Supporting sentence in English"),
  eyebrow_ar: text(120, "Small label above the headline (Arabic)"),
  eyebrow_en: text(120, "Small label above the headline (English)"),
  cta_label_ar: text(60, "Button text in Arabic, e.g. 'تسوّق الآن'"),
  cta_label_en: text(60, "Button text in English"),
  cta_url: text(300, "Button link: a store path like /categories/cctv or /offers, or an https:// URL"),
  image_url: text(500, "Optional https:// image; without it the Kuwait Towers illustration shows"),
  rank: z.number().int().min(0).optional().describe("Display order, 0 first"),
  is_active: z.boolean().optional().describe("false hides the slide without deleting it"),
  starts_at: dateTime("Show from"),
  ends_at: dateTime("Hide after"),
}

const badgeFields = {
  icon: z
    .enum(["shield", "ret", "truck", "wallet", "headset", "wrench", "bolt", "check", "tag", "clock"])
    .describe("Icon: shield=warranty, ret=returns, truck=delivery, wallet=payment, headset=support, wrench=installation"),
  title_ar: z.string().trim().min(1).max(80).describe("Short commitment in Arabic, e.g. 'ضمان سنتين'"),
  title_en: z.string().trim().min(1).max(80).describe("Same in English"),
  subtitle_ar: text(160, "Detail line in Arabic"),
  subtitle_en: text(160, "Detail line in English"),
  rank: z.number().int().min(0).optional().describe("Display order, 0 first"),
  is_active: z.boolean().optional().describe("false hides it without deleting"),
}

export function registerContentTools(server: McpServer) {
  server.registerTool(
    "laly_get_store_content",
    {
      title: "Get store content",
      description:
        "Read everything the storefront shows from the admin: contact details (WhatsApp, phone, email, address, hours), hero carousel slides, and trust badges (warranty/returns/delivery promises). Use before changing any of them.",
      inputSchema: z.strictObject({ response_format: format }),
      annotations: READ,
    },
    async ({ response_format }, ctx) => {
      const signal = ctx.mcpReq.signal
      const [{ settings }, { hero_slides }, { trust_badges }] = await Promise.all([
        api<{ settings: Settings }>("/admin/content/settings", { signal }),
        api<{ hero_slides: Slide[] }>("/admin/content/hero-slides", { signal }),
        api<{ trust_badges: Badge[] }>("/admin/content/trust-badges", { signal }),
      ])
      return respond({ settings, hero_slides, trust_badges }, response_format, () =>
        [
          "# Store content",
          "## Contact",
          ...["whatsapp", "phone", "email", "address_ar", "address_en", "hours_ar", "hours_en"].map(
            (k) => `- ${k}: ${settings[k] ?? "(empty)"}`
          ),
          "",
          "## Hero slides",
          ...hero_slides.map(
            (s) =>
              `- [${s.rank}] ${s.title_ar} / ${s.title_en} (${s.id})${s.is_active ? "" : " — inactive"}` +
              (s.starts_at || s.ends_at ? ` — shown ${s.starts_at ?? "now"} → ${s.ends_at ?? "no end"}` : "")
          ),
          "",
          "## Trust badges",
          ...trust_badges.map(
            (b) => `- [${b.rank}] ${b.title_ar} / ${b.title_en} — ${b.subtitle_ar ?? ""} (${b.id})${b.is_active ? "" : " — inactive"}`
          ),
        ].join("\n")
      )
    }
  )

  server.registerTool(
    "laly_update_contact",
    {
      title: "Update contact details",
      description:
        "Change the store's contact details shown in the header, footer, contact page and WhatsApp button. Only the fields you pass change. An empty string or null hides that link on the storefront. Example: 'change WhatsApp to +965 5555 1234' -> whatsapp='+965 5555 1234'.",
      inputSchema: z.strictObject({
        whatsapp: text(25, "WhatsApp number with country code, digits and spaces only"),
        phone: text(25, "Phone number with country code"),
        email: text(200, "Customer-service email"),
        address_ar: text(300, "Address in Arabic"),
        address_en: text(300, "Address in English"),
        hours_ar: text(120, "Working hours in Arabic, e.g. 'يومياً 9 ص - 10 م'"),
        hours_en: text(120, "Working hours in English"),
      }),
      annotations: WRITE,
    },
    async (input, ctx) => {
      const body = Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v === "" ? null : v])
      )
      if (!Object.keys(body).length) {
        throw new Error("Pass at least one field to change.")
      }
      const { settings } = await api<{ settings: Settings }>("/admin/content/settings", {
        method: "POST",
        body,
        signal: ctx.mcpReq.signal,
      })
      return ok("Contact details updated. The storefront shows them within a minute.", settings)
    }
  )

  server.registerTool(
    "laly_create_hero_slide",
    {
      title: "Create hero slide",
      description:
        "Add a slide to the homepage hero carousel, in Arabic and English. Can be scheduled with starts_at/ends_at (e.g. a campaign slide for one week). Write Arabic first; it is the main language.",
      inputSchema: z.strictObject(slideFields),
      annotations: CREATE,
    },
    async (input, ctx) => {
      const { hero_slide } = await api<{ hero_slide: Slide }>("/admin/content/hero-slides", {
        method: "POST",
        body: input,
        signal: ctx.mcpReq.signal,
      })
      return ok(`Hero slide created (${hero_slide.id}).`, hero_slide)
    }
  )

  server.registerTool(
    "laly_update_hero_slide",
    {
      title: "Update hero slide",
      description:
        "Edit a hero slide: text, link, order, schedule, or is_active=false to pause it. Only passed fields change. Get IDs from laly_get_store_content.",
      inputSchema: z.strictObject({
        id: z.string().startsWith("hero_").describe("Slide ID, e.g. hero_01..."),
        ...Object.fromEntries(Object.entries(slideFields).map(([k, v]) => [k, v.optional()])),
      }),
      annotations: WRITE,
    },
    async ({ id, ...changes }, ctx) => {
      const { hero_slide } = await api<{ hero_slide: Slide }>(`/admin/content/hero-slides/${id}`, {
        method: "POST",
        body: changes,
        signal: ctx.mcpReq.signal,
      })
      return ok(`Hero slide ${id} updated.`, hero_slide)
    }
  )

  server.registerTool(
    "laly_delete_hero_slide",
    {
      title: "Delete hero slide",
      description:
        "Permanently remove a hero slide. To hide it temporarily, use laly_update_hero_slide with is_active=false instead.",
      inputSchema: z.strictObject({ id: z.string().startsWith("hero_").describe("Slide ID") }),
      annotations: DELETE,
    },
    async ({ id }, ctx) => {
      await api(`/admin/content/hero-slides/${id}`, { method: "DELETE", signal: ctx.mcpReq.signal })
      return ok(`Hero slide ${id} deleted.`)
    }
  )

  server.registerTool(
    "laly_create_trust_badge",
    {
      title: "Create trust badge",
      description:
        "Add a customer-facing promise to the trust strip and product pages (warranty, returns, delivery, payment, support). These are commitments to customers: only add what the business actually offers.",
      inputSchema: z.strictObject(badgeFields),
      annotations: CREATE,
    },
    async (input, ctx) => {
      const { trust_badge } = await api<{ trust_badge: Badge }>("/admin/content/trust-badges", {
        method: "POST",
        body: input,
        signal: ctx.mcpReq.signal,
      })
      return ok(`Trust badge created (${trust_badge.id}).`, trust_badge)
    }
  )

  server.registerTool(
    "laly_update_trust_badge",
    {
      title: "Update trust badge",
      description:
        "Edit a trust badge (e.g. change '30-day return' to '14-day return'), reorder it, or is_active=false to hide it. Only passed fields change.",
      inputSchema: z.strictObject({
        id: z.string().startsWith("tbdg_").describe("Badge ID, e.g. tbdg_01..."),
        ...Object.fromEntries(Object.entries(badgeFields).map(([k, v]) => [k, v.optional()])),
      }),
      annotations: WRITE,
    },
    async ({ id, ...changes }, ctx) => {
      const { trust_badge } = await api<{ trust_badge: Badge }>(`/admin/content/trust-badges/${id}`, {
        method: "POST",
        body: changes,
        signal: ctx.mcpReq.signal,
      })
      return ok(`Trust badge ${id} updated.`, trust_badge)
    }
  )

  server.registerTool(
    "laly_delete_trust_badge",
    {
      title: "Delete trust badge",
      description: "Permanently remove a trust badge. Prefer laly_update_trust_badge with is_active=false to hide it.",
      inputSchema: z.strictObject({ id: z.string().startsWith("tbdg_").describe("Badge ID") }),
      annotations: DELETE,
    },
    async ({ id }, ctx) => {
      await api(`/admin/content/trust-badges/${id}`, { method: "DELETE", signal: ctx.mcpReq.signal })
      return ok(`Trust badge ${id} deleted.`)
    }
  )
}
