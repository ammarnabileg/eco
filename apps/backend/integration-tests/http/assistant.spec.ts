import { createServer, IncomingHttpHeaders, Server } from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

jest.setTimeout(120 * 1000)

// A stand-in for the Claude API that plays a scripted conversation.
type Req = { headers: IncomingHttpHeaders; body: Record<string, any> }
const requests: Req[] = []
let script: ((req: Req) => Record<string, unknown>)[] = []
let claude: Server
beforeAll(async () => {
  claude = createServer((req, res) => {
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      const r = { headers: req.headers, body: JSON.parse(raw) }
      requests.push(r)
      const next = script.shift()
      res.setHeader("content-type", "application/json")
      res.end(
        JSON.stringify({
          id: `msg_${requests.length}`,
          type: "message",
          role: "assistant",
          model: r.body.model,
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
          ...(next ? next(r) : { content: [{ type: "text", text: "done" }], stop_reason: "end_turn" }),
        })
      )
    })
  })
  await new Promise<void>((resolve) => claude.listen(0, "127.0.0.1", resolve))
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(claude.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((resolve) => claude.close(() => resolve())))

const toolUse = (id: string, name: string, input: unknown) => ({
  content: [{ type: "tool_use", id, name, input }],
  stop_reason: "tool_use",
})
const lastToolResult = (r: Req) => {
  const last = r.body.messages.at(-1)
  return JSON.parse(last.content[0].content)
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    let variantId: string
    let productId: string

    beforeEach(async () => {
      requests.length = 0
      script = []
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
      const { data } = await api.post(
        "/admin/products",
        {
          title: "Tapo C200",
          status: "published",
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              sku: "TAPO-C200",
              manage_inventory: false,
              options: { Default: "Default" },
              prices: [
                { amount: 14.5, currency_code: "kwd" },
                { amount: 47, currency_code: "usd" },
              ],
            },
          ],
        },
        admin
      )
      productId = data.product.id
      variantId = data.product.variants[0].id
    })

    const chat = (text: string, messages: unknown[] = []) =>
      api.post("/admin/assistant/chat", { messages, text }, { ...admin, validateStatus: () => true })
    const kwdPrice = async () => {
      const { data } = await api.get(`/admin/products/${productId}?fields=variants.prices.*`, admin)
      return data.product.variants[0].prices.map((p: { currency_code: string; amount: number }) => [p.currency_code, p.amount]).sort()
    }

    it("asks for the API key before anything else", async () => {
      const res = await chat("hi")
      expect(res.status).toBe(400)
      expect(res.data.message).toContain("Anthropic API key")
      expect(requests).toHaveLength(0)
    })

    it("looks products up, proposes a price, and changes nothing until the admin confirms", async () => {
      await api.post("/admin/integrations/assistant", { enabled: true, values: { api_key: "sk-ant-test" } }, admin)
      await api.post(
        "/admin/products",
        { title: "Archer AX55", options: [{ title: "Default", values: ["Default"] }], variants: [{ title: "Default", options: { Default: "Default" }, prices: [] }] },
        admin
      )
      script = [
        () => toolUse("t1", "search_products", { q: "Tapo" }),
        (r) => {
          const found = lastToolResult(r).products[0]
          return toolUse("t2", "set_price", { variant_id: found.variants[0].id, price_kwd: 12.9 })
        },
        () => ({ content: [{ type: "text", text: "جهزت التعديل، اضغط تنفيذ." }], stop_reason: "end_turn" }),
      ]
      const res = await chat("خلي سعر تابو C200 بـ 12.900")
      expect(res.status).toBe(200)
      expect(res.data.reply).toBe("جهزت التعديل، اضغط تنفيذ.")

      // What the model saw and how it was called.
      expect(lastToolResult(requests[1]).products).toHaveLength(1) // the search filters
      expect(lastToolResult(requests[1]).products[0]).toMatchObject({ id: productId, variants: [{ id: variantId, price_kwd: 14.5 }] })
      expect(requests[0].body).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", thinking: { type: "adaptive" } })
      expect(requests[0].headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01")
      expect(JSON.stringify(requests[0].headers)).toContain("sk-ant-test") // the key saved in the admin
      expect(requests[0].body.tools.map((t: { name: string }) => t.name)).toContain("adjust_prices")

      const [action] = res.data.actions
      expect(action.summary).toContain("14.500 KWD ← 12.900 KWD")
      expect(await kwdPrice()).toEqual([["kwd", 14.5], ["usd", 47]]) // not applied yet

      const tampered = await api.post(
        "/admin/assistant/execute",
        { action: { ...action, input: { ...action.input, price_kwd: 0.5 } } },
        { ...admin, validateStatus: () => true }
      )
      expect(tampered.status).toBe(400)

      const applied = await api.post("/admin/assistant/execute", { action }, admin)
      expect(applied.data.result).toContain("تم")
      expect(await kwdPrice()).toEqual([["kwd", 12.9], ["usd", 47]]) // other currencies kept

      // The next turn carries the whole history back, thinking and tool blocks included.
      script = [() => ({ content: [{ type: "text", text: "تمام" }], stop_reason: "end_turn" })]
      const next = await chat("شكراً", res.data.messages)
      expect(next.status).toBe(200)
      expect(requests.at(-1)!.body.messages).toHaveLength(res.data.messages.length + 1)
    })

    it("proposes a percentage change over several products with rounding", async () => {
      await api.post("/admin/integrations/assistant", { enabled: true, values: { api_key: "sk-ant-test" } }, admin)
      script = [() => toolUse("t1", "adjust_prices", { product_ids: [productId], percent: 10 })]
      const res = await chat("زود 10%")
      const [action] = res.data.actions
      expect(action.summary).toContain("14.500 KWD ← 16.000 KWD") // 15.95 rounded to 0.1
      await api.post("/admin/assistant/execute", { action }, admin)
      expect(await kwdPrice()).toEqual([["kwd", 16], ["usd", 47]])
    })

    it("tells the model when a tool fails instead of breaking the chat", async () => {
      await api.post("/admin/integrations/assistant", { enabled: true, values: { api_key: "sk-ant-test" } }, admin)
      script = [() => toolUse("t1", "get_product", { product: "no-such-handle" })]
      const res = await chat("hello")
      expect(res.status).toBe(200)
      const result = requests[1].body.messages.at(-1).content[0]
      expect(result).toMatchObject({ is_error: true })
      expect(result.content).toContain("no-such-handle")
    })
  },
})
