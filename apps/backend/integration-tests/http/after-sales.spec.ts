import { createServer, Server } from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { resetRateLimits } from "../../src/api/utils/rate-limit"
import { signTrackToken, trackSecret } from "../../src/workflows/after-sales/token"

jest.setTimeout(120 * 1000)

// A stand-in for Evolution API that records every text sent.
const sent: { number: string; text: string }[] = []
let evolution: Server
let evolutionUrl = ""
beforeAll(async () => {
  evolution = createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      if (req.url?.startsWith("/message/sendText/")) sent.push(JSON.parse(body))
      res.setHeader("content-type", "application/json")
      res.end(JSON.stringify({ key: { id: "msg" } }))
    })
  })
  await new Promise<void>((resolve) => evolution.listen(0, "127.0.0.1", resolve))
  evolutionUrl = `http://127.0.0.1:${(evolution.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((resolve) => evolution.close(() => resolve())))

const waitFor = async (check: () => boolean, ms = 5000) => {
  const end = Date.now() + ms
  while (!check() && Date.now() < end) await new Promise((r) => setTimeout(r, 50))
  return check()
}

type Order = { id: string; display_id: number; items: { id: string; title: string; quantity: number }[] }

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    let store: { headers: Record<string, string> }
    let regionId: string

    const jwt = (actor_id: string, actor_type: string, auth_identity_id = "") => {
      const { http } = getContainer().resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      return generateJwtToken({ actor_id, actor_type, auth_identity_id }, { secret: http.jwtSecret, expiresIn: "1h" })
    }

    beforeEach(async () => {
      sent.length = 0
      resetRateLimits()
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const authIdentity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      admin = { headers: { authorization: `Bearer ${jwt(user.id, "user", authIdentity.id)}` } }
      const { data: region } = await api.post("/admin/regions", { name: "Kuwait", currency_code: "kwd", countries: ["kw"] }, admin)
      regionId = region.region.id
      const { data: key } = await api.post("/admin/api-keys", { title: "Store", type: "publishable" }, admin)
      store = { headers: { "x-publishable-api-key": key.api_key.token } }
    })

    const makeOrder = async (customer_id?: string): Promise<Order> => {
      const { result } = await createOrderWorkflow(getContainer()).run({
        input: {
          region_id: regionId,
          email: "s@b.kw",
          currency_code: "kwd",
          customer_id,
          shipping_address: { first_name: "Sara", country_code: "kw", phone: "5000 1234" },
          items: [
            { title: "Tapo C200", quantity: 2, unit_price: 12.5 },
            { title: "Archer AX55", quantity: 1, unit_price: 30 },
          ],
        },
      })
      return result as unknown as Order
    }
    const trackToken = (orderId: string) => signTrackToken(orderId, trackSecret(getContainer())).token
    const post = (url: string, body: object, headers: Record<string, string> = {}) =>
      api.post(url, body, { headers: { ...store.headers, ...headers }, validateStatus: () => true })
    const request = (order: Order, extra: Record<string, unknown> = {}) => ({
      order_id: order.id,
      kind: "return",
      reason: "defective",
      details: "The camera does not turn on",
      items: [{ line_item_id: order.items.find((i) => i.title === "Tapo C200")!.id, quantity: 1 }],
      ...extra,
    })

    it("lets a guest with a tracking token send a request, and staff manage it", async () => {
      const order = await makeOrder()
      const res = await post("/store/after-sales-requests", request(order), { "x-laly-track-token": trackToken(order.id) })
      expect(res.status).toBe(201)
      expect(res.data.after_sales_request).toMatchObject({ status: "new", kind: "return", order_display_id: order.display_id })

      const { data } = await api.get("/admin/after-sales-requests", admin)
      expect(data.count).toBe(1)
      const row = data.after_sales_requests[0]
      expect(row).toMatchObject({ order_id: order.id, phone: "5000 1234", customer_id: null, reason: "defective" })
      expect(row.items).toEqual([{ line_item_id: expect.any(String), title: "Tapo C200", quantity: 1 }])

      const updated = await api.post(`/admin/after-sales-requests/${row.id}`, { status: "approved", admin_note: "pickup Sunday" }, admin)
      expect(updated.data.after_sales_request).toMatchObject({ status: "approved", admin_note: "pickup Sunday" })
      expect((await api.get(`/admin/after-sales-requests?status=new`, admin)).data.count).toBe(0)
      expect((await api.get(`/admin/after-sales-requests?q=${order.display_id}`, admin)).data.count).toBe(1)

      // Nothing is created in Medusa's own returns.
      const { data: returns } = await getContainer()
        .resolve(ContainerRegistrationKeys.QUERY)
        .graph({ entity: "return", fields: ["id"], filters: { order_id: order.id } })
      expect(returns).toHaveLength(0)
    })

    it("refuses requests without a token or ownership, and with another order's token", async () => {
      const order = await makeOrder()
      const other = await makeOrder()
      expect((await post("/store/after-sales-requests", request(order))).status).toBe(404)
      expect((await post("/store/after-sales-requests", request(order), { "x-laly-track-token": trackToken(other.id) })).status).toBe(404)
      const stranger = await getContainer().resolve(Modules.CUSTOMER).createCustomers({ email: "x@b.kw", has_account: true })
      expect(
        (await post("/store/after-sales-requests", request(order), { authorization: `Bearer ${jwt(stranger.id, "customer")}` })).status
      ).toBe(404)
    })

    it("checks items and quantities against the order", async () => {
      const order = await makeOrder()
      const other = await makeOrder()
      const h = { "x-laly-track-token": trackToken(order.id) }
      const tapo = order.items.find((i) => i.title === "Tapo C200")!.id
      expect((await post("/store/after-sales-requests", request(order, { items: [{ line_item_id: tapo, quantity: 3 }] }), h)).status).toBe(400)
      expect(
        (await post("/store/after-sales-requests", request(order, { items: [{ line_item_id: other.items[0].id, quantity: 1 }] }), h)).status
      ).toBe(400)
      expect((await post("/store/after-sales-requests", request(order, { reason: "broken" }), h)).status).toBe(400)
      expect((await post("/store/after-sales-requests", request(order, { website: "spam" }), h)).status).toBe(400)
      expect((await post("/store/after-sales-requests", request(order, { items: [{ line_item_id: tapo, quantity: 2 }] }), h)).status).toBe(201)
    })

    it("lists only the signed-in customer's own requests", async () => {
      const customers = getContainer().resolve(Modules.CUSTOMER)
      const owner = await customers.createCustomers({ email: "o@b.kw", has_account: true })
      const other = await customers.createCustomers({ email: "x@b.kw", has_account: true })
      const order = await makeOrder(owner.id)
      const auth = (id: string) => ({ authorization: `Bearer ${jwt(id, "customer")}` })
      expect((await post("/store/after-sales-requests", request(order, { kind: "warranty" }), auth(owner.id))).status).toBe(201)
      await post(
        "/store/install-requests",
        { customer_name: "Sara Ali", phone: "+965 5000 1234", governorate: "حولي", service: "cctv" },
        auth(owner.id)
      )

      const mine = await api.get("/store/customers/me/support-requests", { headers: { ...store.headers, ...auth(owner.id) } })
      expect(mine.data.after_sales_requests).toHaveLength(1)
      expect(mine.data.after_sales_requests[0]).toMatchObject({ kind: "warranty", order_display_id: order.display_id })
      expect(mine.data.after_sales_requests[0].admin_note).toBeUndefined()
      expect(mine.data.install_requests).toHaveLength(1)

      const theirs = await api.get("/store/customers/me/support-requests", { headers: { ...store.headers, ...auth(other.id) } })
      expect(theirs.data).toEqual({ install_requests: [], quote_requests: [], after_sales_requests: [] })
      const anonymous = await api.get("/store/customers/me/support-requests", { ...store, validateStatus: () => true })
      expect(anonymous.status).toBe(401)
    })

    it("tells staff on the store's WhatsApp number, and a gateway failure keeps the request", async () => {
      await api.post("/admin/content/settings", { whatsapp: "+965 9999 0000" }, admin)
      await api.post(
        "/admin/integrations/whatsapp",
        { enabled: true, values: { base_url: evolutionUrl, instance: "laly", api_key: "evo-key" } },
        admin
      )
      const order = await makeOrder()
      expect((await post("/store/after-sales-requests", request(order), { "x-laly-track-token": trackToken(order.id) })).status).toBe(201)
      expect(await waitFor(() => sent.some((m) => m.number === "96599990000"))).toBe(true)
      const note = sent.find((m) => m.number === "96599990000")!.text
      expect(note).toContain(`#${order.display_id}`)
      expect(note).toContain("/app/after-sales")
      expect(note).not.toContain("s@b.kw")

      sent.length = 0
      await post("/store/install-requests", { customer_name: "Sara Ali", phone: "+965 5000 1234", governorate: "حولي", service: "cctv" })
      expect(await waitFor(() => sent.some((m) => m.text.includes("طلب تركيب")))).toBe(true)

      // Gateway down: the customer's request still succeeds.
      await api.post("/admin/integrations/whatsapp", { values: { base_url: "http://127.0.0.1:1" } }, admin)
      expect((await post("/store/after-sales-requests", request(order), { "x-laly-track-token": trackToken(order.id) })).status).toBe(201)
    })
  },
})
