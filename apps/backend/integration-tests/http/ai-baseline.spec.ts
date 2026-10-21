import { createServer, Server } from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { AI_MODULE } from "../../src/modules/ai"
import AiModuleService from "../../src/modules/ai/service"

// Repeatable measurement of what the AI features send to the model, for the
// before/after cost comparison (docs/AI-COSTS.md). The model is a scripted
// stand-in; the store data, tools, pages and request building are real. The
// result is printed as one JSON line starting with AI_BASELINE.

jest.setTimeout(240 * 1000)

// The page reader only opens public https sites; here it gets the page below
// from memory and runs the real extraction on it.
jest.mock("../../src/workflows/ai-product/source", () => {
  const actual = jest.requireActual("../../src/workflows/ai-product/source")
  return {
    ...actual,
    fetchPage: async (url: string) => ({ url, ...actual.extractPage((global as Record<string, unknown>).__MANUFACTURER_PAGE__ as string, url) }),
  }
})

type Msg = { role: string; content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[]; tool_call_id?: string }
const answer = (content: string) => ({ finish_reason: "stop", message: { role: "assistant", content } })
const call = (id: string, name: string, args: unknown) => ({
  finish_reason: "tool_calls",
  message: { role: "assistant", content: null, tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }] },
})
const REPLY = "تمام، دي النتيجة باختصار:\n" + "• سطر في الرد من المساعد بالمعلومة المطلوبة والأرقام.\n".repeat(6)

// The scripted assistant: decides from the latest user request and tool results.
function assistantStep(messages: Msg[]) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""
  const last = messages[messages.length - 1]
  const since = messages.slice(messages.lastIndexOf(messages.filter((m) => m.role === "user").at(-1)!) + 1)
  const usedTools = since.filter((m) => m.role === "assistant").flatMap((m) => m.tool_calls?.map((c) => c.function.name) ?? [])
  if (last.role === "user") {
    if (lastUser.includes("مبيعاً")) return call("t1", "sales_summary", { days: 30 })
    if (lastUser.includes("وريني")) return call("t2", "search_products", { q: "Archer", limit: 30 })
    if (lastUser.includes("تفاصيل")) return call("t3", "get_product", { product: "tp-link-archer-ax55" })
    if (lastUser.includes("زوّد")) return call("t4", "search_products", { q: "Archer", limit: 30 })
    return answer(REPLY)
  }
  if (lastUser.includes("زوّد") && !usedTools.includes("adjust_prices")) {
    const found = JSON.parse(String(last.content)).products as { id: string }[]
    return call("t5", "adjust_prices", { product_ids: found.map((p) => p.id), percent: 5 })
  }
  return answer(REPLY)
}

let fake: Server
let categoryId = ""
beforeAll(async () => {
  fake = createServer((req, res) => {
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      const body = JSON.parse(raw)
      const prompt_tokens = Math.ceil(raw.length / 4)
      const usage = { prompt_tokens, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 0 }, cost: prompt_tokens * 1e-7 }
      res.setHeader("content-type", "application/json")
      const choice = body.tools
        ? assistantStep(body.messages)
        : answer(
            JSON.stringify({
              title_ar: "راوتر TP-Link Archer AX55 واي فاي 6",
              title_en: "TP-Link Archer AX55 AX3000 Wi-Fi 6 Router",
              description_ar: "وصف ".repeat(150),
              description_en: "Description ".repeat(120),
              specs: {},
              category_id: categoryId,
              handle: "archer-ax55",
              questions: [{ question_ar: "هل تبيعه مع تركيب؟" }],
            })
          )
      res.end(JSON.stringify({ id: "gen", choices: [choice], usage }))
    })
  })
  await new Promise<void>((resolve) => fake.listen(0, "127.0.0.1", resolve))
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((resolve) => fake.close(() => resolve())))

// A manufacturer page as they come: menus, scripts, footer and the specs.
const MANUFACTURER_PAGE = `<html><head><title>Archer AX55 | AX3000 Dual-Band Gigabit Wi-Fi 6 Router | TP-Link</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Archer AX55","brand":{"@type":"Brand","name":"TP-Link"},"model":"Archer AX55","description":"AX3000 Dual-Band Gigabit Wi-Fi 6 Router"}</script>
<script>${"window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}".repeat(200)}</script>
<style>${".nav a{color:#333;padding:4px}".repeat(400)}</style></head><body>
<nav>${Array.from({ length: 400 }, (_, i) => `<a href="/ae/product-${i}/">Product category link number ${i}</a>`).join("\n")}</nav>
<h1>Archer AX55</h1><h2>AX3000 Dual-Band Gigabit Wi-Fi 6 Router</h2>
<p>${"Wi-Fi 6 gives faster speeds, greater capacity and reduced network congestion for every device in your home. ".repeat(40)}</p>
<table class="spec">${[
  ["Wireless Standards", "IEEE 802.11ax/ac/n/a 5 GHz, IEEE 802.11ax/n/b/g 2.4 GHz"],
  ["WiFi Speeds", "AX3000 5 GHz: 2402 Mbps (802.11ax) 2.4 GHz: 574 Mbps (802.11ax)"],
  ["Ethernet Ports", "1× Gigabit WAN Port, 4× Gigabit LAN Ports"],
  ["Antennas", "4× Fixed High-Performance External Antennas"],
  ["Processor", "1.5 GHz Tri-Core CPU"],
  ["USB", "1× USB 3.0 Port"],
  ["Security", "WPA3, WPA2, WPA, WPA/WPA2-Enterprise"],
].map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>
<section class="related">${Array.from({ length: 60 }, (_, i) => `<div class="card"><h3>Related product ${i}</h3><p>Short marketing blurb for a different router model ${i}.</p></div>`).join("")}</section>
<footer>${Array.from({ length: 200 }, (_, i) => `<a href="/ae/support/${i}">Support, legal and country link ${i}</a>`).join(" ")}</footer>
</body></html>`
;(global as Record<string, unknown>).__MANUFACTURER_PAGE__ = MANUFACTURER_PAGE

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    beforeEach(async () => {
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const identity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      admin = {
        headers: {
          authorization: `Bearer ${generateJwtToken(
            { actor_id: user.id, actor_type: "user", auth_identity_id: identity.id },
            { secret: http.jwtSecret, expiresIn: "1h" }
          )}`,
        },
      }
      await api.post(
        "/admin/integrations/assistant",
        { enabled: true, values: { provider: "openrouter", openrouter_api_key: "sk-or", openrouter_model: "vendor/flash" } },
        admin
      )
    })

    const totals = async (task: string) => {
      const rows = await getContainer().resolve<AiModuleService>(AI_MODULE).listAiUsages({ task }, { take: 1000, order: { created_at: "ASC" } })
      return {
        requests: rows.length,
        request_chars: rows.reduce((s, r) => s + r.request_chars, 0),
        largest_request_chars: Math.max(0, ...rows.map((r) => r.request_chars)),
        approx_input_tokens: rows.reduce((s, r) => s + r.input_tokens, 0),
      }
    }

    it("measures a four-question assistant conversation and a product draft with one update", async () => {
      // Store data the tools read: 40 products with long descriptions, 30 orders.
      const { data: region } = await api.post("/admin/regions", { name: "Kuwait", currency_code: "kwd", countries: ["kw"] }, admin)
      categoryId = (await api.post("/admin/product-categories", { name: "Routers", is_active: true }, admin)).data.product_category.id
      await api.post(
        "/admin/catalog/spec-templates",
        {
          name_ar: "راوترات",
          name_en: "Routers",
          category_ids: [categoryId],
          attributes: [
            { key: "wifi_standard", label_ar: "معيار الواي فاي", label_en: "Wi-Fi standard", type: "text" },
            { key: "lan_ports", label_ar: "منافذ LAN", label_en: "LAN ports", type: "number" },
            { key: "usb", label_ar: "USB", label_en: "USB", type: "boolean" },
          ],
        },
        admin
      )
      const ids: string[] = []
      for (let i = 0; i < 40; i++) {
        const router = i < 15
        const title = router ? `TP-Link Archer AX${50 + i} Wi-Fi 6 Router` : `Hikvision DS-2CD${2000 + i} 4MP Camera`
        const { data } = await api.post(
          "/admin/products",
          {
            title,
            handle: i === 5 ? "tp-link-archer-ax55" : undefined,
            status: "published",
            description: "منتج أصلي بضمان، مناسب للبيوت والمكاتب في الكويت. ".repeat(25),
            categories: [{ id: categoryId }],
            options: [{ title: "Default", values: ["Default"] }],
            variants: [{ title: "Default", sku: `SKU-${i}`, manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 10 + i, currency_code: "kwd" }] }],
          },
          admin
        )
        ids.push(data.product.id)
      }
      for (let i = 0; i < 30; i++) {
        await createOrderWorkflow(getContainer()).run({
          input: {
            region_id: region.region.id,
            email: `c${i}@b.kw`,
            currency_code: "kwd",
            items: [{ title: "Item", product_id: ids[i % 40], quantity: 1 + (i % 3), unit_price: 12 }],
          },
        })
      }

      // Assistant: four questions in one conversation, history carried like the admin page does.
      let messages: unknown[] = []
      let provider: string | undefined
      let lastActions: { tool: string; input: { changes?: { variant_id: string; price_kwd: number }[] } }[] = []
      for (const text of ["إيه أكتر المنتجات مبيعاً الشهر ده؟", "وريني راوترات TP-Link", "تفاصيل Archer AX55", "زوّد أسعار كل راوترات TP-Link 5%"]) {
        const { data } = await api.post("/admin/assistant/chat", { messages, text, provider }, admin)
        messages = data.messages
        provider = data.provider
        lastActions = data.actions
      }
      // The bulk price change is one proposal listing every TP-Link router, fixed at proposal time.
      expect(lastActions).toHaveLength(1)
      expect(lastActions[0].tool).toBe("adjust_prices")
      expect(lastActions[0].input.changes).toHaveLength(15)
      expect(lastActions[0].input.changes![0]).toEqual({ variant_id: expect.stringMatching(/^variant_/), price_kwd: 10.5 })
      const chat = await totals("admin_chat")
      expect(chat.requests).toBeGreaterThanOrEqual(9)

      // Product: draft from the manufacturer's page with no category chosen, then one update with answers.
      const draft1 = { name: "TP-Link Archer AX55", source_url: "https://www.tp-link.com/ae/archer-ax55/", price_kwd: 29.9 }
      await api.post("/admin/ai-products/draft", draft1, admin)
      await api.post("/admin/ai-products/draft", { ...draft1, notes: "هل تبيعه مع تركيب؟ نعم" }, admin)
      const draft = await totals("product_draft")

      console.log(`AI_BASELINE ${JSON.stringify({ chat, draft })}`)
    })
  },
})
