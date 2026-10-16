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

    beforeEach(async () => {
      const container = getContainer()
      const user = await container
        .resolve(Modules.USER)
        .createUsers({ email: "admin@test.local" })
      const authIdentity = await container
        .resolve(Modules.AUTH)
        .createAuthIdentities({
          provider_identities: [
            { provider: "emailpass", entity_id: "admin@test.local" },
          ],
          app_metadata: { user_id: user.id },
        })
      const { http } = container.resolve(
        ContainerRegistrationKeys.CONFIG_MODULE
      ).projectConfig
      const token = generateJwtToken(
        {
          actor_id: user.id,
          actor_type: "user",
          auth_identity_id: authIdentity.id,
        },
        { secret: http.jwtSecret, expiresIn: "1h" }
      )
      adminHeaders = { headers: { authorization: `Bearer ${token}` } }

      const [key] = await container
        .resolve(Modules.API_KEY)
        .listApiKeys({ type: "publishable" })
      storeHeaders = { headers: { "x-publishable-api-key": key.token } }
    })

    describe("Store content", () => {
      it("serves admin-managed content to the storefront", async () => {
        await api.post(
          "/admin/content/trust-badges",
          { icon: "shield", title_ar: "ضمان", title_en: "Warranty" },
          adminHeaders
        )
        await api.post(
          "/admin/content/hero-slides",
          { title_ar: "أمان", title_en: "Security", is_active: true },
          adminHeaders
        )
        await api.post(
          "/admin/content/hero-slides",
          { title_ar: "مخفي", title_en: "Hidden", is_active: false },
          adminHeaders
        )

        const { data } = await api.get("/store/content", storeHeaders)
        expect(data.trust_badges.map((b) => b.title_en)).toContain("Warranty")
        expect(data.hero_slides.map((s) => s.title_en)).toEqual(["Security"])
        expect(data.settings).toBeTruthy()
      })

      it("rejects admin writes without authentication", async () => {
        const res = await api
          .post("/admin/content/settings", { phone: "+96550000000" })
          .catch((e) => e.response)
        expect(res.status).toEqual(401)
      })

      it("updates contact settings and validates input", async () => {
        const { data } = await api.post(
          "/admin/content/settings",
          { whatsapp: "+965 5000 0000" },
          adminHeaders
        )
        expect(data.settings.whatsapp).toEqual("+965 5000 0000")

        const bad = await api
          .post("/admin/content/settings", { whatsapp: "<script>" }, adminHeaders)
          .catch((e) => e.response)
        expect(bad.status).toEqual(400)
      })

      it("hides scheduled hero slides until they start", async () => {
        const before = (await api.get("/store/content", storeHeaders)).data
          .hero_slides.length

        const { data } = await api.post(
          "/admin/content/hero-slides",
          { title_ar: "قريباً", title_en: "Soon", starts_at: "2099-01-01T00:00:00Z" },
          adminHeaders
        )
        expect(
          (await api.get("/store/content", storeHeaders)).data.hero_slides
        ).toHaveLength(before)

        await api.post(
          `/admin/content/hero-slides/${data.hero_slide.id}`,
          { starts_at: null },
          adminHeaders
        )
        expect(
          (await api.get("/store/content", storeHeaders)).data.hero_slides
        ).toHaveLength(before + 1)
      })

      it("rejects unsafe call-to-action links", async () => {
        const res = await api
          .post(
            "/admin/content/hero-slides",
            { title_ar: "x", title_en: "x", cta_url: "javascript:alert(1)" },
            adminHeaders
          )
          .catch((e) => e.response)
        expect(res.status).toEqual(400)
      })
    })
  },
})
