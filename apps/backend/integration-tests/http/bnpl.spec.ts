import { createServer, Server } from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

jest.setTimeout(120 * 1000)

// A stand-in for Deema: creating a purchase is all the session needs.
let deema: Server
let deemaUrl = ""
beforeAll(async () => {
  deema = createServer((req, res) => {
    req.resume()
    res.setHeader("content-type", "application/json")
    res.end(
      JSON.stringify({
        data: { order_reference: `ref-${Date.now()}`, redirect_link: "https://pay.deema.test/x", order_status: "pending" },
      })
    )
  })
  await new Promise<void>((resolve) => deema.listen(0, "127.0.0.1", resolve))
  deemaUrl = `http://127.0.0.1:${(deema.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((resolve) => deema.close(() => resolve())))

process.env.STOREFRONT_URL = "https://laly.test"

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    let store: { headers: Record<string, string> }
    let regionId: string
    const categories: Record<string, string> = {}
    const products: Record<string, { id: string; variant: string }> = {}

    beforeEach(async () => {
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

      // Deema configured in the admin and offered in Kuwait.
      await api.post(
        "/admin/integrations/deema",
        { enabled: true, values: { api_key: "test-key", base_url: deemaUrl } },
        admin
      )
      const { data: region } = await api.post(
        "/admin/regions",
        { name: "Kuwait", currency_code: "kwd", countries: ["kw"], payment_providers: ["pp_deema_deema"] },
        admin
      )
      regionId = region.region.id
      const { data: channel } = await api.post("/admin/sales-channels", { name: "Web" }, admin)
      const { data: key } = await api.post("/admin/api-keys", { title: "Store", type: "publishable" }, admin)
      await api.post(`/admin/api-keys/${key.api_key.id}/sales-channels`, { add: [channel.sales_channel.id] }, admin)
      store = { headers: { "x-publishable-api-key": key.api_key.token } }

      // cameras: Deema allowed; cameras > dome inherits; routers: Deema denied.
      const mk = async (name: string, extra: Record<string, unknown> = {}) =>
        (await api.post("/admin/product-categories", { name, is_active: true, ...extra }, admin)).data.product_category.id
      categories.cameras = await mk("Cameras", { metadata: { bnpl: { deema: "allow" }, seo_title: "kept" } })
      categories.dome = await mk("Dome", { parent_category_id: categories.cameras })
      categories.routers = await mk("Routers", { metadata: { bnpl: { deema: "deny" } } })
      categories.misc = await mk("Misc")

      const product = async (title: string, cats: string[], metadata: Record<string, unknown> = {}) => {
        const { data } = await api.post(
          "/admin/products",
          {
            title,
            status: "published",
            metadata,
            sales_channels: [{ id: channel.sales_channel.id }],
            categories: cats.map((id) => ({ id })),
            options: [{ title: "Default", values: ["Default"] }],
            variants: [
              { title: "Default", manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 20, currency_code: "kwd" }] },
            ],
          },
          admin
        )
        return { id: data.product.id, variant: data.product.variants[0].id }
      }
      products.dome = await product("Dome camera", [categories.dome])
      products.router = await product("Router", [categories.routers])
      products.mixed = await product("Camera router kit", [categories.cameras, categories.routers])
      products.excepted = await product("Router allowed", [categories.routers], { bnpl: { deema: "allow" } })
      products.uncategorized = await product("Cable", [])
    })

    const eligibility = async (key: string) =>
      (await api.get(`/store/bnpl?product_ids=${products[key].id}`, store)).data.products[products[key].id]

    const cartWith = async (...keys: string[]) => {
      const { data } = await api.post("/store/carts", { region_id: regionId, email: "a@b.kw" }, store)
      for (const k of keys) {
        await api.post(`/store/carts/${data.cart.id}/line-items`, { variant_id: products[k].variant, quantity: 1 }, store)
      }
      return data.cart.id as string
    }

    const startDeema = async (cartId: string) => {
      const { data } = await api.post("/store/payment-collections", { cart_id: cartId }, store)
      return api.post(
        `/store/payment-collections/${data.payment_collection.id}/payment-sessions`,
        { provider_id: "pp_deema_deema", data: { return_url: "https://laly.test/api/payment-redirect" } },
        { ...store, validateStatus: () => true }
      )
    }

    it("resolves eligibility from products, nested and conflicting categories", async () => {
      expect(await eligibility("dome")).toEqual({ deema: true, taly: false })
      expect(await eligibility("router")).toEqual({ deema: false, taly: false })
      expect(await eligibility("mixed")).toEqual({ deema: false, taly: false })
      expect(await eligibility("excepted")).toEqual({ deema: true, taly: false })
      expect(await eligibility("uncategorized")).toEqual({ deema: false, taly: false })
    })

    it("offers instalments only when every product in the cart is eligible", async () => {
      const eligible = await cartWith("dome", "excepted")
      const mixed = await cartWith("dome", "router")
      expect((await api.get(`/store/bnpl?cart_id=${eligible}`, store)).data.cart).toEqual({ deema: true, taly: false })
      expect((await api.get(`/store/bnpl?cart_id=${mixed}`, store)).data.cart).toEqual({ deema: false, taly: false })
    })

    it("refuses an instalment session on the server for a cart with an ineligible product", async () => {
      const refused = await startDeema(await cartWith("dome", "router"))
      expect(refused.status).toBe(400)
      expect(refused.data.message).toContain("Instalments are not available")

      const allowed = await startDeema(await cartWith("dome"))
      expect(allowed.status).toBe(200)
    })

    it("refuses to complete the order when the cart stopped being eligible after paying started", async () => {
      const cartId = await cartWith("dome")
      expect((await startDeema(cartId)).status).toBe(200)

      // The product is switched off for Deema while the customer is paying.
      await api.post(`/admin/products/${products.dome.id}`, { metadata: { bnpl: { deema: "deny" } } }, admin)
      const complete = await api.post(`/store/carts/${cartId}/complete`, {}, { ...store, validateStatus: () => true })
      expect(complete.status).toBe(400)
      expect(complete.data.message).toContain("Instalments are not available")
    })

    it("keeps other category metadata when the admin saves instalment settings", async () => {
      const { data } = await api.get(`/admin/product-categories/${categories.cameras}?fields=metadata`, admin)
      expect(data.product_category.metadata).toMatchObject({ seo_title: "kept", bnpl: { deema: "allow" } })
    })
  },
})
