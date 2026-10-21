import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { clearRecommendationCache } from "../../src/workflows/recommendations"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    let store: { headers: Record<string, string> }
    let regionId: string
    const products: Record<string, string> = {}

    const token = (actor_id: string, actor_type: string, auth_identity_id = "") => {
      const { http } = getContainer().resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      return generateJwtToken({ actor_id, actor_type, auth_identity_id }, { secret: http.jwtSecret, expiresIn: "1h" })
    }

    beforeEach(async () => {
      clearRecommendationCache()
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const identity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      admin = { headers: { authorization: `Bearer ${token(user.id, "user", identity.id)}` } }
      const { data: region } = await api.post("/admin/regions", { name: "Kuwait", currency_code: "kwd", countries: ["kw"] }, admin)
      regionId = region.region.id
      const { data: key } = await api.post("/admin/api-keys", { title: "Store", type: "publishable" }, admin)
      store = { headers: { "x-publishable-api-key": key.api_key.token } }

      const category = async (name: string) =>
        (await api.post("/admin/product-categories", { name, is_active: true }, admin)).data.product_category.id
      const brand = async (name: string, handle: string) =>
        (await api.post("/admin/catalog/brands", { name, handle }, admin)).data.brand.id
      const routers = await category("Routers")
      const cameras = await category("Cameras")
      const cables = await category("Cables")
      const tplink = await brand("TP-Link", "tp-link")
      const asus = await brand("ASUS", "asus")

      const product = async (key: string, cat: string, brandId: string | null, status = "published") => {
        const { data } = await api.post(
          "/admin/products",
          {
            title: key,
            status,
            categories: [{ id: cat }],
            options: [{ title: "Default", values: ["Default"] }],
            variants: [{ title: "Default", manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 10, currency_code: "kwd" }] }],
          },
          admin
        )
        if (brandId) await api.post(`/admin/catalog/products/${data.product.id}`, { brand_id: brandId }, admin)
        products[key] = data.product.id
      }
      await product("archer-ax55", routers, tplink)
      await product("archer-ax73", routers, tplink)
      await product("rt-ax58", routers, asus)
      await product("tapo-c200", cameras, tplink)
      await product("cable", cables, null)
      await product("draft-router", routers, tplink, "draft")
    })

    const order = (productKey: string, quantity: number, customer_id?: string) =>
      createOrderWorkflow(getContainer()).run({
        input: {
          region_id: regionId,
          email: "c@b.kw",
          currency_code: "kwd",
          ...(customer_id ? { customer_id } : {}),
          items: [{ title: productKey, product_id: products[productKey], quantity, unit_price: 10 }],
        },
      })

    const recommend = (query: string, headers: Record<string, string> = {}) =>
      api.get(`/store/recommendations?${query}`, { headers: { ...store.headers, ...headers } }).then((r) => r.data)

    it("shows best sellers to a new visitor", async () => {
      await order("cable", 5)
      await order("tapo-c200", 2)
      const data = await recommend("limit=2")
      expect(data.based_on).toBe("popular")
      expect(data.for_you).toEqual([products.cable, products["tapo-c200"]])
      expect(data.buy_again).toEqual([])
    })

    it("follows what a visitor looked at, without repeating it or showing drafts", async () => {
      const data = await recommend(`viewed=${products["archer-ax55"]},not-an-id`)
      expect(data.based_on).toBe("views")
      expect(data.for_you[0]).toBe(products["archer-ax73"]) // same category and brand
      expect(data.for_you).not.toContain(products["archer-ax55"])
      expect(data.for_you).not.toContain(products["draft-router"])
    })

    it("uses a signed-in customer's orders for picks and buy-again", async () => {
      const customer = await getContainer().resolve(Modules.CUSTOMER).createCustomers({ email: "sara@b.kw", has_account: true })
      await order("tapo-c200", 1, customer.id)
      const data = await recommend("", { authorization: `Bearer ${token(customer.id, "customer")}` })
      expect(data.based_on).toBe("orders")
      expect(data.buy_again).toEqual([products["tapo-c200"]])
      expect(data.for_you).not.toContain(products["tapo-c200"])
      expect(data.for_you.slice(0, 2).sort()).toEqual([products["archer-ax55"], products["archer-ax73"]].sort()) // same brand
    })
  },
})
