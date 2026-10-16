import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  generateJwtToken,
  Modules,
} from "@medusajs/framework/utils"

jest.setTimeout(90 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: { headers: Record<string, string> }
    let storeHeaders: { headers: Record<string, string> }
    let variantId: string
    let productId: string

    beforeEach(async () => {
      const container = getContainer()
      const user = await container
        .resolve(Modules.USER)
        .createUsers({ email: "admin@test.local" })
      const authIdentity = await container
        .resolve(Modules.AUTH)
        .createAuthIdentities({
          provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
          app_metadata: { user_id: user.id },
        })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const token = generateJwtToken(
        { actor_id: user.id, actor_type: "user", auth_identity_id: authIdentity.id },
        { secret: http.jwtSecret, expiresIn: "1h" }
      )
      adminHeaders = { headers: { authorization: `Bearer ${token}` } }

      const [key] = await container.resolve(Modules.API_KEY).listApiKeys({ type: "publishable" })
      storeHeaders = { headers: { "x-publishable-api-key": key.token } }

      const { data } = await api.post(
        "/admin/products",
        {
          title: "Test camera",
          status: "published",
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              options: { Default: "Default" },
              prices: [{ amount: 20, currency_code: "kwd" }],
            },
          ],
        },
        adminHeaders
      )
      productId = data.product.id
      variantId = data.product.variants[0].id
    })

    const createOffer = (body: Record<string, unknown>) =>
      api.post(
        "/admin/price-lists",
        {
          title: "Offer",
          description: "test",
          type: "sale",
          status: "active",
          prices: [{ variant_id: variantId, amount: 15, currency_code: "kwd" }],
          ...body,
        },
        adminHeaders
      )

    it("lists a running offer with its real end date", async () => {
      const endsAt = new Date(Date.now() + 86400000).toISOString()
      await createOffer({ ends_at: endsAt })

      const { data } = await api.get("/store/offers", storeHeaders)
      expect(data.offers).toHaveLength(1)
      expect(data.offers[0].product_ids).toEqual([productId])
      expect(new Date(data.offers[0].ends_at).toISOString()).toEqual(endsAt)
    })

    it("publishes the product in the Google Merchant feed with its sale window", async () => {
      await api.post(
        "/admin/regions",
        { name: "Kuwait", currency_code: "kwd", countries: ["kw"] },
        adminHeaders
      )
      const endsAt = new Date(Date.now() + 86400000).toISOString()
      await createOffer({ ends_at: endsAt })

      const res = await api.get("/feeds/google/ar")
      expect(res.headers["content-type"]).toContain("application/xml")
      expect(res.data).toContain("<g:title>Test camera</g:title>")
      expect(res.data).toContain("<g:price>20.000 KWD</g:price>")
      expect(res.data).toContain("<g:sale_price>15.000 KWD</g:sale_price>")
      expect(res.data).toContain(`/${endsAt}</g:sale_price_effective_date>`)

      const bad = await api.get("/feeds/google/fr").catch((e) => e.response)
      expect(bad.status).toEqual(404)
    })

    it("drops offers that ended or have not started", async () => {
      await createOffer({ ends_at: new Date(Date.now() - 60000).toISOString() })
      await createOffer({ starts_at: new Date(Date.now() + 86400000).toISOString() })

      const { data } = await api.get("/store/offers", storeHeaders)
      expect(data.offers).toHaveLength(0)
    })
  },
})
