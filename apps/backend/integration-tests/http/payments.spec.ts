import { createHmac } from "node:crypto"
import http from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

jest.setTimeout(120 * 1000)

// A stand-in for KlickPay's v3 API: tokens, KNET links, status and refunds.
const gateway = {
  paid: false,
  paidAmount: "0",
  links: [] as Record<string, unknown>[],
  refunds: [] as unknown[],
}
const server = http.createServer((req, res) => {
  let raw = ""
  req.on("data", (c) => (raw += c))
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : {}
    const send = (o: unknown) => {
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify(o))
    }
    if (req.url === "/v3/auth/token") {
      return send({ success: true, data: { access_token: "tok", expires_in: 3600 } })
    }
    if (req.headers.authorization !== "Bearer tok") {
      res.statusCode = 401
      return send({ success: false })
    }
    if (req.url === "/v3/payments/knet") {
      gateway.links.push(body)
      return send({
        success: true,
        code: "PAYMENT_LINK_CREATED",
        data: { payment_id: `QI${gateway.links.length}`, payment_url: "https://kpay.test/pay", amount: String(body.transction_amount) },
      })
    }
    if (req.url === "/v3/payments/status") {
      return send({
        success: true,
        data: gateway.paid
          ? { status: "paid", result: "CAPTURED", amount: gateway.paidAmount, payment_id: body.payment_id }
          : { status: "pending", payment_id: body.payment_id },
      })
    }
    if (req.url?.startsWith("/v3/refunds/")) {
      gateway.refunds.push({ path: req.url, ...body })
      return send({ success: true, code: "REFUND_SUCCESS", data: { refund_status: "success" } })
    }
    res.statusCode = 404
    send({})
  })
})

let port = 0
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  port = (server.address() as AddressInfo).port
  process.env.KLICKPAY_BASE_URL = `http://127.0.0.1:${port}/v3`
})
afterAll(() => server.close())

process.env.KLICKPAY_CLIENT_ID = "id"
process.env.KLICKPAY_CLIENT_SECRET = "secret"
process.env.KLICKPAY_WEBHOOK_SECRET = "whsec"
process.env.KLICKPAY_METHODS = "knet"
process.env.STOREFRONT_URL = "https://laly.test"

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: { headers: Record<string, string> }
    let storeHeaders: { headers: Record<string, string> }
    let cartId: string

    beforeEach(async () => {
      gateway.paid = false
      gateway.links = []
      gateway.refunds = []
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const authIdentity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      const { http: httpConfig } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const token = generateJwtToken(
        { actor_id: user.id, actor_type: "user", auth_identity_id: authIdentity.id },
        { secret: httpConfig.jwtSecret, expiresIn: "1h" }
      )
      adminHeaders = { headers: { authorization: `Bearer ${token}` } }

      const { data: sc } = await api.post("/admin/sales-channels", { name: "Web" }, adminHeaders)
      const { data: key } = await api.post("/admin/api-keys", { title: "store", type: "publishable" }, adminHeaders)
      await api.post(`/admin/api-keys/${key.api_key.id}/sales-channels`, { add: [sc.sales_channel.id] }, adminHeaders)
      storeHeaders = { headers: { "x-publishable-api-key": key.api_key.token } }

      const { data: region } = await api.post(
        "/admin/regions",
        { name: "Kuwait", currency_code: "kwd", countries: ["kw"], payment_providers: ["pp_klickpay_knet"] },
        adminHeaders
      )
      const { data: loc } = await api.post("/admin/stock-locations", { name: "Hawally" }, adminHeaders)
      await api.post(`/admin/stock-locations/${loc.stock_location.id}/sales-channels`, { add: [sc.sales_channel.id] }, adminHeaders)
      const { data: profile } = await api.post("/admin/shipping-profiles", { name: "Default", type: "default" }, adminHeaders)
      const profiles = { shipping_profiles: [profile.shipping_profile] }
      const { data: fs } = await api.post(
        `/admin/stock-locations/${loc.stock_location.id}/fulfillment-sets?fields=*fulfillment_sets`,
        { name: "Kuwait delivery", type: "shipping" },
        adminHeaders
      )
      const set = fs.stock_location.fulfillment_sets[0]
      const { data: zone } = await api.post(
        `/admin/fulfillment-sets/${set.id}/service-zones?fields=*service_zones`,
        { name: "Kuwait", geo_zones: [{ type: "country", country_code: "kw" }] },
        adminHeaders
      )
      await api.post(
        `/admin/stock-locations/${loc.stock_location.id}/fulfillment-providers`,
        { add: ["manual_manual"] },
        adminHeaders
      )
      const { data: so } = await api.post(
        "/admin/shipping-options",
        {
          name: "Delivery",
          service_zone_id: zone.fulfillment_set.service_zones[0].id,
          shipping_profile_id: profiles.shipping_profiles[0].id,
          provider_id: "manual_manual",
          price_type: "flat",
          type: { label: "Standard", description: "Standard", code: "standard" },
          prices: [{ currency_code: "kwd", amount: 1 }],
        },
        adminHeaders
      )
      const { data: product } = await api.post(
        "/admin/products",
        {
          title: "Router",
          status: "published",
          shipping_profile_id: profiles.shipping_profiles[0].id,
          sales_channels: [{ id: sc.sales_channel.id }],
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            { title: "Default", manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 26.4, currency_code: "kwd" }] },
          ],
        },
        adminHeaders
      )
      const { data: cart } = await api.post(
        "/store/carts",
        {
          region_id: region.region.id,
          email: "buyer@laly.test",
          shipping_address: { first_name: "Ahmad", last_name: "Ali", address_1: "Block 2", city: "Hawally", country_code: "kw", phone: "+96599991234" },
          billing_address: { first_name: "Ahmad", last_name: "Ali", address_1: "Block 2", city: "Hawally", country_code: "kw", phone: "+96599991234" },
          items: [{ variant_id: product.product.variants[0].id, quantity: 1 }],
        },
        storeHeaders
      )
      cartId = cart.cart.id
      await api.post(`/store/carts/${cartId}/shipping-methods`, { option_id: so.shipping_option.id }, storeHeaders)
    })

    const startKnet = async () => {
      const { data: pc } = await api.post("/store/payment-collections", { cart_id: cartId }, storeHeaders)
      const { data } = await api.post(
        `/store/payment-collections/${pc.payment_collection.id}/payment-sessions`,
        {
          provider_id: "pp_klickpay_knet",
          data: {
            return_url: `https://laly.test/api/payment-redirect?cart_id=${cartId}`,
            customer: { name: "Ahmad Ali", email: "buyer@laly.test", phone: "+96599991234" },
          },
        },
        storeHeaders
      )
      return data.payment_collection.payment_sessions[0]
    }

    it("sends the customer to KNET and places the order once KlickPay confirms payment", async () => {
      const session = await startKnet()
      expect(session.data.redirect_url).toBe("https://kpay.test/pay")
      expect(gateway.links[0]).toMatchObject({ transction_amount: 27.4, transction_reference: session.id, source: "web_app" })
      expect(gateway.links[0].success_page).toContain("result=success")

      // The customer comes back before paying: no order.
      const early = await api.post(`/store/carts/${cartId}/complete`, {}, storeHeaders).catch((e) => e.response)
      expect(early.data.type).not.toBe("order")

      gateway.paid = true
      gateway.paidAmount = "27.400"
      const { data } = await api.post(`/store/carts/${cartId}/complete`, {}, storeHeaders)
      expect(data.type).toBe("order")
      const { data: admin } = await api.get(`/admin/orders/${data.order.id}?fields=payment_status,total`, adminHeaders)
      expect(admin.order.payment_status).toBe("captured")
      expect(admin.order.total).toBe(27.4)

      // Refunds from the admin go to KlickPay: partial, then the rest.
      const { data: withPayments } = await api.get(
        `/admin/orders/${data.order.id}?fields=*payment_collections.payments`,
        adminHeaders
      )
      const paymentId = withPayments.order.payment_collections[0].payments[0].id
      await api.post(`/admin/payments/${paymentId}/refund`, { amount: 10 }, adminHeaders)
      expect(gateway.refunds[0]).toMatchObject({ path: "/v3/refunds/partial", payment_id: "QI1", refund_amount: "10.000" })
      await api.post(`/admin/payments/${paymentId}/refund`, { amount: 17.4 }, adminHeaders)
      expect(gateway.refunds[1]).toMatchObject({ path: "/v3/refunds/partial", refund_amount: "17.400" })
    })

    it("refuses an order paid for less than its total", async () => {
      await startKnet()
      gateway.paid = true
      gateway.paidAmount = "1.000"
      const res = await api.post(`/store/carts/${cartId}/complete`, {}, storeHeaders).catch((e) => e.response)
      expect(res.data.type).not.toBe("order")
    })

    it("ignores webhooks without a valid KlickPay signature", async () => {
      const session = await startKnet()
      gateway.paid = true
      gateway.paidAmount = "27.400"
      const body = JSON.stringify({ event_type: "payment.success", invoice_id: "QI1", client_reference: session.id })
      const forged = await api
        .post("/hooks/payment/klickpay_knet", body, {
          headers: { "content-type": "application/json", "x-klickpay-signature": "00", "x-klickpay-timestamp": String(Math.floor(Date.now() / 1000)) },
        })
        .catch((e) => e.response)
      expect(forged.status).toBeLessThan(500)
      const signature = createHmac("sha256", "whsec").update(body).digest("hex")
      const ok = await api.post("/hooks/payment/klickpay_knet", body, {
        headers: { "content-type": "application/json", "x-klickpay-signature": signature, "x-klickpay-timestamp": String(Math.floor(Date.now() / 1000)) },
      })
      expect(ok.status).toBe(200)
    })
  },
})
