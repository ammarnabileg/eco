import { createServer, Server } from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { resetRateLimits } from "../../src/api/utils/rate-limit"

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
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
      await api.post(
        "/admin/integrations/whatsapp",
        { enabled: true, values: { base_url: evolutionUrl, instance: "laly", api_key: "evo-key" } },
        admin
      )
      const { data: region } = await api.post("/admin/regions", { name: "Kuwait", currency_code: "kwd", countries: ["kw"] }, admin)
      regionId = region.region.id
      const { data: key } = await api.post("/admin/api-keys", { title: "Store", type: "publishable" }, admin)
      store = { headers: { "x-publishable-api-key": key.api_key.token } }
    })

    const makeOrder = async (phone: string, customer_id?: string) => {
      const { result } = await createOrderWorkflow(getContainer()).run({
        input: {
          region_id: regionId,
          email: "s@b.kw",
          currency_code: "kwd",
          customer_id,
          shipping_address: { first_name: "Sara", country_code: "kw", phone },
          items: [{ title: "Tapo C200", quantity: 2, unit_price: 12.5 }],
        },
      })
      return result as unknown as { id: string; display_id: number }
    }
    const post = (url: string, body: object, headers: Record<string, string> = {}) =>
      api.post(url, body, { headers: { ...store.headers, ...headers }, validateStatus: () => true })
    const view = (token: string) =>
      api.get("/store/track-order", { headers: { ...store.headers, "x-laly-track-token": token }, validateStatus: () => true })
    const lastCode = () => sent.at(-1)!.text.match(/\d{6}/)![0]

    it("sends a code to the order's phone and shows the order after it is verified", async () => {
      const order = await makeOrder("5000 1234")
      const res = await post("/store/track-order", { display_id: order.display_id, phone: "+965 5000-1234" })
      expect(res.data).toEqual({ status: "code_sent" })
      expect(await waitFor(() => sent.length === 1)).toBe(true)
      expect(sent[0].number).toBe("96550001234")
      const code = lastCode()

      const ok = await post("/store/track-order/verify", { display_id: order.display_id, phone: "50001234", code })
      expect(ok.status).toBe(200)
      expect(ok.data.verified).toBe(true)
      const { data } = await view(ok.data.token)
      expect(data.order.id).toBe(order.id)
      expect(data.order.items[0]).toMatchObject({ title: "Tapo C200", quantity: 2 })
      expect(data.order.total).toBe(25)
      expect(data.order.timeline.map((s: { key: string; done: boolean }) => [s.key, s.done])).toEqual([
        ["placed", true],
        ["paid", false],
        ["preparing", false],
        ["shipped", false],
        ["delivered", false],
      ])
      // No addresses, emails or customer ids in the tracking view.
      expect(JSON.stringify(data)).not.toMatch(/s@b\.kw|5000|customer_id/)

      // Single use.
      const again = await post("/store/track-order/verify", { display_id: order.display_id, phone: "50001234", code })
      expect(again.status).toBe(400)
    })

    it("answers the same for a wrong phone or a missing order, and sends nothing", async () => {
      const order = await makeOrder("5000 1234")
      const wrongPhone = await post("/store/track-order", { display_id: order.display_id, phone: "6000 9999" })
      const missing = await post("/store/track-order", { display_id: order.display_id + 1000, phone: "5000 1234" })
      expect(wrongPhone.status).toBe(missing.status)
      expect(wrongPhone.data).toEqual(missing.data)
      expect(wrongPhone.data).toEqual({ status: "code_sent" })
      await pause(300)
      expect(sent).toHaveLength(0)

      const verifyWrong = await post("/store/track-order/verify", { display_id: order.display_id, phone: "6000 9999", code: "123456" })
      const verifyMissing = await post("/store/track-order/verify", { display_id: order.display_id + 1000, phone: "5000 1234", code: "123456" })
      expect(verifyWrong.status).toBe(400)
      expect(verifyWrong.data.message).toBe(verifyMissing.data.message)
    })

    it("locks a code after 5 wrong attempts", async () => {
      const order = await makeOrder("5000 1234")
      await post("/store/track-order", { display_id: order.display_id, phone: "50001234" })
      await waitFor(() => sent.length === 1)
      const code = lastCode()
      const wrong = code === "000000" ? "111111" : "000000"
      for (let i = 0; i < 5; i++) {
        expect((await post("/store/track-order/verify", { display_id: order.display_id, phone: "50001234", code: wrong })).status).toBe(400)
      }
      expect((await post("/store/track-order/verify", { display_id: order.display_id, phone: "50001234", code })).status).toBe(400)
    })

    it("rate limits lookups per order number", async () => {
      const order = await makeOrder("5000 1234")
      const statuses: number[] = []
      for (let i = 0; i < 6; i++) statuses.push((await post("/store/track-order", { display_id: order.display_id, phone: "6000 0000" })).status)
      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
      expect(statuses[5]).toBe(429)
    })

    it("lets the signed-in owner skip the code, but not another customer", async () => {
      const customers = getContainer().resolve(Modules.CUSTOMER)
      const owner = await customers.createCustomers({ email: "o@b.kw", has_account: true })
      const other = await customers.createCustomers({ email: "x@b.kw", has_account: true })
      const order = await makeOrder("5000 1234", owner.id)
      const mine = await post("/store/track-order", { display_id: order.display_id }, { authorization: `Bearer ${jwt(owner.id, "customer")}` })
      expect(mine.data.status).toBe("verified")
      expect((await view(mine.data.token)).data.order.id).toBe(order.id)
      const theirs = await post("/store/track-order", { display_id: order.display_id }, { authorization: `Bearer ${jwt(other.id, "customer")}` })
      expect(theirs.data).toEqual({ status: "code_sent" })
    })

    it("refuses forged tokens and says when WhatsApp is not set up", async () => {
      expect((await view("abc.def")).status).toBe(401)
      await api.post("/admin/integrations/whatsapp", { enabled: false }, admin)
      const order = await makeOrder("5000 1234")
      expect((await post("/store/track-order", { display_id: order.display_id, phone: "50001234" })).data).toEqual({ status: "unavailable" })
    })
  },
})
