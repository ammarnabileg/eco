import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

jest.setTimeout(120 * 1000)

// Keys entered in the admin, not the environment.
for (const name of ["KLICKPAY_CLIENT_ID", "KLICKPAY_CLIENT_SECRET", "KLICKPAY_METHODS", "QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"]) {
  delete process.env[name]
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: { headers: Record<string, string> }
    let storeHeaders: { headers: Record<string, string> }
    let regionId: string

    beforeEach(async () => {
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const authIdentity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const token = generateJwtToken(
        { actor_id: user.id, actor_type: "user", auth_identity_id: authIdentity.id },
        { secret: http.jwtSecret, expiresIn: "1h" }
      )
      adminHeaders = { headers: { authorization: `Bearer ${token}` } }
      const { data } = await api.post("/admin/regions", { name: "Kuwait", currency_code: "kwd", countries: ["kw"] }, adminHeaders)
      regionId = data.region.id
      const { data: key } = await api.post("/admin/api-keys", { title: "Store", type: "publishable" }, adminHeaders)
      storeHeaders = { headers: { "x-publishable-api-key": key.api_key.token } }
    })

    const regionProviders = async () => {
      const { data } = await api.get(`/admin/regions/${regionId}?fields=payment_providers.id`, adminHeaders)
      return (data.region.payment_providers as { id: string }[]).map((p) => p.id).sort()
    }
    const save = (key: string, body: Record<string, unknown>) =>
      api.post(`/admin/integrations/${key}`, body, { ...adminHeaders, validateStatus: () => true })

    it("turns a gateway on from the admin, offers only its chosen methods, and never returns secrets", async () => {
      const refused = await save("klickpay", { enabled: true })
      expect(refused.status).toBe(400)
      expect(refused.data.message).toContain("Client ID")

      const ok = await save("klickpay", {
        enabled: true,
        values: { client_id: "kp-id", client_secret: "kp-very-secret", methods: ["knet", "card"] },
      })
      expect(ok.status).toBe(200)
      expect(ok.data.integration).toMatchObject({ active: true, enabled: true })
      expect(await regionProviders()).toEqual(["pp_klickpay_card", "pp_klickpay_knet"])

      const { data } = await api.get("/admin/integrations", adminHeaders)
      const text = JSON.stringify(data)
      expect(text).not.toContain("kp-very-secret")
      const secret = data.integrations
        .find((i: { key: string }) => i.key === "klickpay")
        .fields.find((f: { key: string }) => f.key === "client_secret")
      expect(secret).toMatchObject({ has_value: true, value: null, source: "admin" })

      // An empty secret keeps the saved one; narrowing methods updates checkout.
      await save("klickpay", { values: { client_secret: "", methods: ["knet"] } })
      expect(await regionProviders()).toEqual(["pp_klickpay_knet"])
      const row = await getContainer().resolve("integrations").findRow("klickpay")
      expect(row.secrets).not.toContain("kp-very-secret")

      await save("klickpay", { enabled: false })
      expect(await regionProviders()).toEqual([])
    })

    it("publishes only public IDs of switched-on tools to the storefront", async () => {
      await save("clarity", { enabled: true, values: { project_id: "abc123xyz" } })
      await save("adsense", { enabled: false, values: { client: "ca-pub-1234567890123456" } })
      await save("deema", { values: { api_key: "deema-secret-key", widget_key: "pk_widget" } })

      const { data } = await api.get("/store/integrations", storeHeaders)
      expect(data.integrations).toEqual({ clarity: { project_id: "abc123xyz" } })
      expect(JSON.stringify(data)).not.toContain("deema-secret-key")
    })

    it("feeds QuickBooks app keys saved in the admin to the QuickBooks connection", async () => {
      const before = await api.get("/admin/quickbooks", adminHeaders)
      expect(before.data.configured).toBe(false)

      await save("quickbooks", { enabled: true, values: { client_id: "qb-id", client_secret: "qb-secret", environment: "sandbox" } })
      const after = await api.get("/admin/quickbooks", adminHeaders)
      expect(after.data.configured).toBe(true)
      const { data } = await api.post("/admin/quickbooks/connect", {}, adminHeaders)
      expect(new URL(data.url).searchParams.get("client_id")).toBe("qb-id")
    })
  },
})
