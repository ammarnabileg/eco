import { createServer, Server } from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

import { whatsappWebhookToken } from "../../src/workflows/whatsapp"

jest.setTimeout(120 * 1000)

// A stand-in for Evolution API that records every message sent.
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

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    let store: { headers: Record<string, string> }
    let regionId: string

    beforeEach(async () => {
      sent.length = 0
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const authIdentity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      admin = {
        headers: {
          authorization: `Bearer ${generateJwtToken(
            { actor_id: user.id, actor_type: "user", auth_identity_id: authIdentity.id },
            { secret: http.jwtSecret, expiresIn: "1h" }
          )}`,
        },
      }
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

    const guestCart = async () => {
      const { data } = await api.post(
        "/store/carts",
        { region_id: regionId, email: "guest@b.kw", shipping_address: { first_name: "G", country_code: "kw", phone: "5000 1234" } },
        store
      )
      return data.cart.id as string
    }
    const call = (method: "get" | "post", url: string, body?: object) =>
      method === "get"
        ? api.get(url, { ...store, validateStatus: () => true })
        : api.post(url, body, { ...store, validateStatus: () => true })
    const codeSent = () => sent.at(-1)!.text.match(/\d{6}/)![0]

    it("makes a guest verify the shipping phone by WhatsApp before paying", async () => {
      const cartId = await guestCart()
      expect((await call("get", `/store/whatsapp/otp?cart_id=${cartId}`)).data).toEqual({
        required: true,
        verified: false,
        phone: "+965 •••• 1234",
      })
      const blocked = await call("post", `/store/carts/${cartId}/complete`, {})
      expect(blocked.status).toBe(400)
      expect(blocked.data.message).toContain("WhatsApp code")

      expect((await call("post", "/store/whatsapp/otp", { cart_id: cartId })).status).toBe(200)
      expect(sent.at(-1)!.number).toBe("96550001234")
      const code = codeSent()

      const wrong = await call("post", "/store/whatsapp/otp/verify", { cart_id: cartId, code: code === "000000" ? "111111" : "000000" })
      expect(wrong.status).toBe(400)
      expect((await call("post", "/store/whatsapp/otp/verify", { cart_id: cartId, code })).data).toEqual({ verified: true })
      expect((await call("get", `/store/whatsapp/otp?cart_id=${cartId}`)).data.verified).toBe(true)
    })

    it("limits how many codes one cart can request", async () => {
      const cartId = await guestCart()
      for (let i = 0; i < 3; i++) expect((await call("post", "/store/whatsapp/otp", { cart_id: cartId })).status).toBe(200)
      expect((await call("post", "/store/whatsapp/otp", { cart_id: cartId })).status).toBe(400)
      expect(sent).toHaveLength(3)
    })

    it("asks nothing when guest verification is switched off", async () => {
      await api.post("/admin/integrations/whatsapp", { values: { guest_otp: "off" } }, admin)
      const cartId = await guestCart()
      expect((await call("get", `/store/whatsapp/otp?cart_id=${cartId}`)).data.required).toBe(false)
    })

    it("records the customer's reply to the order message and answers it", async () => {
      const wa = getContainer().resolve("whatsapp") as {
        createWaOrderConfirmations: (d: object) => Promise<{ id: string }>
        retrieveWaOrderConfirmation: (id: string) => Promise<{ status: string }>
      }
      const row = await wa.createWaOrderConfirmations({ order_id: "order_1", phone: "96550001234", status: "sent" })
      const hook = (headers: Record<string, string>, text = "١") =>
        api.post(
          "/hooks/whatsapp",
          { event: "messages.upsert", data: { key: { remoteJid: "96550001234@s.whatsapp.net" }, message: { conversation: text } } },
          { headers, validateStatus: () => true }
        )

      expect((await hook({ "x-laly-token": "wrong" })).status).toBe(401)
      expect((await hook({ "x-laly-token": whatsappWebhookToken() }, "شكرا")).data.handled).toBe(false)
      expect((await hook({ "x-laly-token": whatsappWebhookToken() })).data.handled).toBe(true)
      expect((await wa.retrieveWaOrderConfirmation(row.id)).status).toBe("confirmed")
    })
  },
})
