import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

import { resetRateLimits } from "../../src/api/utils/rate-limit"

// The installation booking form: validated, protected from bots and floods,
// and handled by staff from the admin.

jest.setTimeout(90 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    let store: { headers: Record<string, string> }
    const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    const valid = {
      customer_name: "أحمد العلي",
      phone: "+965 9000 0000",
      governorate: "حولي",
      area: "السالمية",
      service: "cctv",
      preferred_date: tomorrow,
      message: "بيت دورين، 6 كاميرات تقريباً",
      locale: "ar",
      website: "",
    }

    beforeEach(async () => {
      resetRateLimits()
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const identity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      admin = {
        headers: {
          authorization: `Bearer ${generateJwtToken(
            { actor_id: user.id, actor_type: "user", auth_identity_id: identity.id },
            { secret: http.jwtSecret, expiresIn: "1h" }
          )}`,
        },
      }
      const [key] = await container.resolve(Modules.API_KEY).listApiKeys({ type: "publishable" })
      store = { headers: { "x-publishable-api-key": key.token } }
    })

    const send = (body: Record<string, unknown>, ip = "10.0.0.1") =>
      api
        .post("/store/install-requests", body, { headers: { ...store.headers, "x-forwarded-for": ip } })
        .catch((e) => e.response)

    it("stores a booking for staff and only confirms receipt to the customer", async () => {
      const res = await send(valid)
      expect(res.status).toBe(201)
      expect(res.data.install_request).toEqual({ id: expect.stringMatching(/^ireq_/), status: "new" })

      const { data } = await api.get("/admin/catalog/install-requests", admin)
      expect(data.install_requests).toHaveLength(1)
      expect(data.install_requests[0]).toMatchObject({ customer_name: "أحمد العلي", governorate: "حولي", service: "cctv", preferred_date: tomorrow })

      const id = data.install_requests[0].id
      await api.post(`/admin/catalog/install-requests/${id}`, { status: "scheduled", admin_note: "الخميس 4 العصر" }, admin)
      const { data: after } = await api.get("/admin/catalog/install-requests?status=scheduled", admin)
      expect(after.install_requests[0]).toMatchObject({ status: "scheduled", admin_note: "الخميس 4 العصر" })
    })

    it("refuses bots, bad data and past dates", async () => {
      // Each from its own address: failed attempts count toward the limit too.
      expect((await send({ ...valid, website: "http://spam" }, "10.1.0.1")).status).toBe(400)
      expect((await send({ ...valid, governorate: "Cairo" }, "10.1.0.2")).status).toBe(400)
      expect((await send({ ...valid, phone: "123" }, "10.1.0.3")).status).toBe(400)
      expect((await send({ ...valid, preferred_date: "2020-01-01" }, "10.1.0.4")).status).toBe(400)
      expect((await send({ ...valid, service: "plumbing" }, "10.1.0.5")).status).toBe(400)
      expect((await send({ ...valid, product_id: "prod_missing" }, "10.1.0.6")).status).toBe(404)
      const { data } = await api.get("/admin/catalog/install-requests", admin)
      expect(data.count).toBe(0)
    })

    it("limits each visitor to 5 bookings an hour", async () => {
      for (let i = 0; i < 5; i++) expect((await send(valid, "10.0.0.9")).status).toBe(201)
      const blocked = await send(valid, "10.0.0.9")
      expect(blocked.status).toBe(429)
      expect((await send(valid, "10.0.0.10")).status).toBe(201)
    })
  },
})
