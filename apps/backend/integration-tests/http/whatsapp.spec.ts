import { createServer, Server } from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { whatsappWebhookToken } from "../../src/workflows/whatsapp"
import { remindAbandonedCarts } from "../../src/workflows/whatsapp/rich"

jest.setTimeout(120 * 1000)

// A stand-in for Evolution API that records every message sent.
const sent: { number: string; text: string }[] = []
const calls: { path: string; body: Record<string, any> }[] = []
let refuseInteractive = false
let evolution: Server
let evolutionUrl = ""
beforeAll(async () => {
  evolution = createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      if (req.url?.startsWith("/message/sendText/")) sent.push(JSON.parse(body))
      calls.push({ path: String(req.url).split("/").slice(0, 3).join("/"), body: body ? JSON.parse(body) : {} })
      res.setHeader("content-type", "application/json")
      if (refuseInteractive && !req.url?.startsWith("/message/sendText/")) {
        res.statusCode = 400
        return res.end(JSON.stringify({ message: "not supported" }))
      }
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
      calls.length = 0
      refuseInteractive = false
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

    it("sends a test message from the admin", async () => {
      const res = await api.post("/admin/whatsapp/send-test", { phone: "+965 5000 1234" }, { ...admin, validateStatus: () => true })
      expect(res.status).toBe(200)
      expect(sent.at(-1)!.number).toBe("96550001234")
    })

    const enableInteractive = (extra: Record<string, string> = {}) =>
      api.post("/admin/integrations/whatsapp", { values: { interactive: "on", ...extra } }, admin)

    it("sends the guest code with a copy button, and as text when buttons are refused", async () => {
      await enableInteractive()
      const cartId = await guestCart()
      await call("post", "/store/whatsapp/otp", { cart_id: cartId })
      const buttons = calls.at(-1)!
      expect(buttons.path).toBe("/message/sendButtons")
      expect(buttons.body.buttons[0]).toMatchObject({ type: "copy", copyCode: buttons.body.description.match(/\d{6}/)[0] })

      refuseInteractive = true
      await call("post", "/store/whatsapp/otp", { cart_id: cartId })
      expect(calls.at(-1)!.path).toBe("/message/sendText")
      expect(sent.at(-1)!.text).toMatch(/\d{6}/)
    })

    const publishedProduct = async (title: string, thumbnail: string | null) => {
      const { data } = await api.post(
        "/admin/products",
        {
          title,
          status: "published",
          thumbnail,
          options: [{ title: "Default", values: ["Default"] }],
          variants: [{ title: "Default", manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 12.5, currency_code: "kwd" }] }],
        },
        admin
      )
      return data.product as { id: string; handle: string; variants: { id: string }[] }
    }

    it("lets staff send products as cards, or as links when a product has no image", async () => {
      await enableInteractive()
      const withImage = await publishedProduct("Tapo C200", "https://cdn.test/c200.jpg")
      const res = await api.post("/admin/whatsapp/products", { phone: "50001234", product_ids: [withImage.id] }, admin)
      expect(res.data.kind).toBe("carousel")
      const card = calls.at(-1)!.body.cards[0]
      expect(card).toMatchObject({ body: "Tapo C200", footer: "12.500 د.ك", imageUrl: "https://cdn.test/c200.jpg" })
      expect(card.buttons[0].url).toContain(`/kw/products/${withImage.handle}`)

      const noImage = await publishedProduct("Cable", null)
      const text = await api.post("/admin/whatsapp/products", { phone: "50001234", product_ids: [noImage.id] }, admin)
      expect(text.data.kind).toBe("text")
      expect(sent.at(-1)!.text).toContain("Cable — 12.500 د.ك")
    })

    it("reminds an abandoned cart once, with a link that reopens it", async () => {
      await enableInteractive({ cart_reminder: "on" })
      const product = await publishedProduct("Router", null)
      const { data: channel } = await api.post("/admin/sales-channels", { name: "Web" }, admin)
      await api.post(`/admin/sales-channels/${channel.sales_channel.id}/products`, { add: [product.id] }, admin)
      const { data: key } = await api.post("/admin/api-keys", { title: "Web", type: "publishable" }, admin)
      await api.post(`/admin/api-keys/${key.api_key.id}/sales-channels`, { add: [channel.sales_channel.id] }, admin)
      const web = { headers: { "x-publishable-api-key": key.api_key.token } }
      const { data } = await api.post(
        "/store/carts",
        { region_id: regionId, email: "a@b.kw", shipping_address: { first_name: "Sara", country_code: "kw", phone: "5000 1234" } },
        web
      )
      await api.post(`/store/carts/${data.cart.id}/line-items`, { variant_id: product.variants[0].id, quantity: 2 }, web)

      const later = Date.now() + 3 * 3600 * 1000
      expect(await remindAbandonedCarts(getContainer(), Date.now())).toBe(0) // too fresh
      expect(await remindAbandonedCarts(getContainer(), later)).toBe(1)
      expect(await remindAbandonedCarts(getContainer(), later)).toBe(0) // never twice
      const msg = calls.at(-1)!
      expect(msg.body.number).toBe("96550001234")
      expect(JSON.stringify(msg.body)).toContain(`/kw/cart/recover/${data.cart.id}`)
      expect(JSON.stringify(msg.body)).toContain("Router × 2")
    })

    it("keeps every message in the inbox and lets staff reply", async () => {
      const incoming = (id: string, text: string) =>
        api.post(
          "/hooks/whatsapp",
          {
            event: "messages.upsert",
            instance: "laly",
            data: { pushName: "Sara", key: { id, remoteJid: "96550001234@s.whatsapp.net" }, message: { conversation: text } },
          },
          { headers: { "x-laly-token": whatsappWebhookToken() } }
        )
      await incoming("m1", "عندكم كاميرا خارجية؟")
      await incoming("m1", "عندكم كاميرا خارجية؟") // delivered twice by the gateway
      await incoming("m2", "📷")

      const list = await api.get("/admin/whatsapp/conversations?unread=true", admin)
      expect(list.data.unread).toBe(1)
      const [conversation] = list.data.conversations
      expect(conversation).toMatchObject({ phone: "96550001234", name: "Sara", unread: 2, last_preview: "📷" })
      expect((await api.get("/admin/whatsapp/conversations?q=1234", admin)).data.count).toBe(1)
      expect((await api.get("/admin/whatsapp/conversations?q=nobody", admin)).data.count).toBe(0)

      const reply = await api.post(
        `/admin/whatsapp/conversations/${conversation.id}/messages`,
        { text: "أيوه متوفرة 👍" },
        { ...admin, validateStatus: () => true }
      )
      expect(reply.status).toBe(200)
      expect(sent.at(-1)).toMatchObject({ number: "96550001234", text: "أيوه متوفرة 👍" })

      await api.post(`/admin/whatsapp/conversations/${conversation.id}/read`, {}, admin)
      const thread = (await api.get(`/admin/whatsapp/conversations/${conversation.id}`, admin)).data
      expect(thread.conversation.unread).toBe(0)
      expect(thread.messages.map((m: { direction: string; body: string; kind: string }) => [m.direction, m.kind, m.body])).toEqual([
        ["in", "customer", "عندكم كاميرا خارجية؟"],
        ["in", "customer", "📷"],
        ["out", "staff", "أيوه متوفرة 👍"],
      ])
      expect(thread.messages[2].author_id).toBeTruthy()
      expect(thread.orders).toEqual([])

      // Orders show beside the conversation when their shipping phone matches, however it was typed.
      const order = async (phone: string) =>
        (
          await createOrderWorkflow(getContainer()).run({
            input: {
              region_id: regionId,
              email: "s@b.kw",
              currency_code: "kwd",
              shipping_address: { first_name: "Sara", country_code: "kw", phone },
              items: [{ title: "Tapo C200", quantity: 1, unit_price: 12.5 }],
            },
          })
        ).result.id
      const mine = await order("+965 5000-1234")
      await order("6000 9999")
      const again = (await api.get(`/admin/whatsapp/conversations/${conversation.id}`, admin)).data
      expect(again.orders.map((o: { id: string }) => o.id)).toEqual([mine])
    })

    it("keeps automatic messages and failed sends in the customer's conversation", async () => {
      const cartId = await guestCart()
      await call("post", "/store/whatsapp/otp", { cart_id: cartId })
      await api.post("/admin/integrations/whatsapp", { values: { base_url: "http://127.0.0.1:1" } }, admin)
      const failed = await api.post("/admin/whatsapp/send-test", { phone: "50001234" }, { ...admin, validateStatus: () => true })
      expect(failed.status).toBeGreaterThanOrEqual(400)

      const [conversation] = (await api.get("/admin/whatsapp/conversations", admin)).data.conversations
      const { messages } = (await api.get(`/admin/whatsapp/conversations/${conversation.id}`, admin)).data
      expect(messages.map((m: { kind: string; status: string }) => [m.kind, m.status])).toEqual([
        ["otp", "sent"],
        ["test", "failed"],
      ])
      expect(messages[1].error).toContain("unreachable")
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

      // A tap on the "cancel" button of another order message.
      const second = await wa.createWaOrderConfirmations({ order_id: "order_2", phone: "96550001234", status: "sent" })
      const tap = await api.post(
        "/hooks/whatsapp",
        {
          event: "messages.upsert",
          data: {
            key: { remoteJid: "96550001234@s.whatsapp.net" },
            message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{"id":"laly_cancel"}' } } },
          },
        },
        { headers: { "x-laly-token": whatsappWebhookToken() } }
      )
      expect(tap.data.handled).toBe(true)
      expect((await wa.retrieveWaOrderConfirmation(second.id)).status).toBe("cancel_requested")
    })
  },
})
