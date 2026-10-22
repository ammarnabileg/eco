import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

// Information pages: drafts stay private, each publish is a numbered version,
// edits after publishing don't reach customers until the next publish.

jest.setTimeout(90 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    let store: { headers: Record<string, string> }

    beforeEach(async () => {
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

    const fail = (p: Promise<unknown>) => p.then(() => ({ status: 200, data: null }) as { status: number; data: { message?: string } | null }).catch((e) => e.response)

    it("keeps drafts private, publishes numbered versions and hides on request", async () => {
      const { data: list } = await api.get("/admin/content/pages", admin)
      expect(list.pages.map((p: { slug: string }) => p.slug)).toEqual(["about", "faq", "installation", "shipping-policy", "return-policy", "warranty", "privacy-policy", "terms"])

      await api.post("/admin/content/pages/return-policy", { title_ar: "سياسة الإرجاع", body_ar: "## المدة\nنص تجريبي." }, admin)
      expect((await fail(api.get("/store/content/pages/return-policy", store))).status).toBe(404)

      const { data: published } = await api.post("/admin/content/pages/return-policy/publish", {}, admin)
      expect(published.page).toMatchObject({ version: 1, is_published: true })
      const { data: live } = await api.get("/store/content/pages/return-policy", store)
      expect(live.page).toMatchObject({ version: 1, title_ar: "سياسة الإرجاع", body_ar: "## المدة\nنص تجريبي." })
      expect((await api.get("/store/content", store)).data.pages).toEqual([{ slug: "return-policy", title_ar: "سياسة الإرجاع", title_en: "" }])

      // An edit is a draft: customers keep seeing version 1.
      await api.post("/admin/content/pages/return-policy", { title_ar: "سياسة الإرجاع", body_ar: "## المدة\nنص معدّل." }, admin)
      expect((await api.get("/store/content/pages/return-policy", store)).data.page.body_ar).toBe("## المدة\nنص تجريبي.")
      const { data: summary } = await api.get("/admin/content/pages", admin)
      expect(summary.pages.find((p: { slug: string }) => p.slug === "return-policy").has_draft_changes).toBe(true)

      await api.post("/admin/content/pages/return-policy/publish", {}, admin)
      expect((await api.get("/store/content/pages/return-policy", store)).data.page).toMatchObject({ version: 2, body_ar: "## المدة\nنص معدّل." })
      const { data: detail } = await api.get("/admin/content/pages/return-policy", admin)
      expect(detail.revisions.map((r: { version: number }) => r.version)).toEqual([2, 1])

      await api.post("/admin/content/pages/return-policy/unpublish", {}, admin)
      expect((await fail(api.get("/store/content/pages/return-policy", store))).status).toBe(404)
      expect((await api.get("/store/content", store)).data.pages).toEqual([])
    })

    it("publishes an FAQ made only of questions", async () => {
      await api.post(
        "/admin/content/pages/faq",
        { title_ar: "الأسئلة الشائعة", faq: [{ group_ar: "التوصيل", q_ar: "بتوصلوا فين؟", a_ar: "لكل مناطق الكويت." }] },
        admin
      )
      await api.post("/admin/content/pages/faq/publish", {}, admin)
      const { data } = await api.get("/store/content/pages/faq", store)
      expect(data.page.faq).toEqual([{ group_ar: "التوصيل", q_ar: "بتوصلوا فين؟", a_ar: "لكل مناطق الكويت." }])
    })

    it("refuses HTML, empty pages and unknown pages", async () => {
      const html = await fail(api.post("/admin/content/pages/terms", { title_ar: "الشروط", body_ar: "<script>alert(1)</script>" }, admin))
      expect(html.status).toBe(400)
      await api.post("/admin/content/pages/terms", { title_ar: "الشروط", body_ar: "   " }, admin)
      const empty = await fail(api.post("/admin/content/pages/terms/publish", {}, admin))
      expect(empty.status).toBe(400)
      expect(empty.data?.message).toContain("فاضية")
      expect((await fail(api.post("/admin/content/pages/../settings", { title_ar: "x" }, admin))).status).toBeGreaterThanOrEqual(400)
      expect((await fail(api.post("/admin/content/pages/careers", { title_ar: "x" }, admin))).status).toBe(404)
      expect((await fail(api.get("/store/content/pages/terms", store))).status).toBe(404)
    })
  },
})
