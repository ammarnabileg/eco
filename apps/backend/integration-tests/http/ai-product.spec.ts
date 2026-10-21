import { createServer, Server } from "node:http"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

import { storeFile } from "../../src/workflows/ai-product/create"

jest.setTimeout(120 * 1000)

// A stand-in for OpenRouter: text, image edits and an asynchronous video job.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")
const calls: { path: string; body: any }[] = []
let draftAnswer: Record<string, unknown> = {}
let videoPolls = 0
let fake: Server
beforeAll(async () => {
  fake = createServer((req, res) => {
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      const path = String(req.url)
      calls.push({ path, body: raw ? JSON.parse(raw) : null })
      res.setHeader("content-type", "application/json")
      if (path === "/chat/completions") {
        return res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "```json\n" + JSON.stringify(draftAnswer) + "\n```" } }] }))
      }
      if (path === "/images") return res.end(JSON.stringify({ data: [{ b64_json: PNG.toString("base64"), media_type: "image/png" }] }))
      if (path === "/videos") return res.end(JSON.stringify({ id: "vid1", status: "pending" }))
      if (path === "/videos/vid1") return res.end(JSON.stringify({ id: "vid1", status: ++videoPolls > 1 ? "completed" : "in_progress" }))
      if (path.startsWith("/videos/vid1/content")) {
        res.setHeader("content-type", "video/mp4")
        return res.end(Buffer.from("fake-mp4"))
      }
      res.statusCode = 404
      res.end("{}")
    })
  })
  await new Promise<void>((resolve) => fake.listen(0, "127.0.0.1", resolve))
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((resolve) => fake.close(() => resolve())))

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    let categoryId: string
    let brandId: string
    let memoryCards: string

    beforeEach(async () => {
      calls.length = 0
      videoPolls = 0
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
      await api.post(
        "/admin/integrations/assistant",
        {
          enabled: true,
          values: { provider: "openrouter", openrouter_api_key: "sk-or", openrouter_model: "vendor/writer", image_model: "vendor/img", video_model: "vendor/vid" },
        },
        admin
      )
      await api.post("/admin/regions", { name: "Kuwait", currency_code: "kwd", countries: ["kw"] }, admin)
      categoryId = (await api.post("/admin/product-categories", { name: "Cameras", is_active: true }, admin)).data.product_category.id
      await api.post(
        "/admin/catalog/spec-templates",
        {
          name_ar: "كاميرات",
          name_en: "Cameras",
          category_ids: [categoryId],
          attributes: [
            { key: "resolution_mp", label_ar: "الدقة", label_en: "Resolution", type: "number", unit: "MP" },
            { key: "night_vision", label_ar: "رؤية ليلية", label_en: "Night vision", type: "boolean" },
          ],
        },
        admin
      )
      brandId = (await api.post("/admin/catalog/brands", { name: "TP-Link", handle: "tp-link" }, admin)).data.brand.id
      memoryCards = (
        await api.post("/admin/catalog/addon-groups", { name_ar: "كارت ميموري", name_en: "Memory card", kind: "memory_card" }, admin)
      ).data.addon_group.id

      draftAnswer = {
        title_ar: "كاميرا مراقبة واي فاي Tapo C200",
        title_en: "Tapo C200 Pan/Tilt Wi-Fi Camera",
        subtitle_ar: "تغطية 360° للبيت",
        description_ar: "وصف",
        description_en: "Description",
        highlights_ar: ["دقة 1080p", ""],
        specs: { resolution_mp: 2, night_vision: true, battery_life: "10 years" },
        missing_specs: ["lens_mm"],
        faq: [
          { question_ar: "هل تحتاج إنترنت؟", answer_ar: "للمشاهدة عن بعد نعم.", question_en: "Internet?", answer_en: "For remote viewing." },
          { question_ar: "ناقص" },
        ],
        seo_title_ar: "كاميرا Tapo C200",
        handle: "Tapo C200 Camera!",
        brand: "tp-link",
        category_id: "pcat_unknown",
        addon_group_ids: [memoryCards, "addgrp_fake"],
        variants: { option_ar: "اللون", option_en: "Color", values: ["أبيض"] },
        questions: [{ question_ar: "هل بتبيعها مع تركيب؟", suggestion_ar: "ضيف خدمة تركيب" }],
        notes: "",
      }
    })

    it("writes a grounded draft and keeps only what fits the store", async () => {
      const { data } = await api.post(
        "/admin/ai-products/draft",
        { name: "Tapo C200", category_id: categoryId, source_text: "Tapo C200 1080p, night vision up to 12 m", price_kwd: 12.5 },
        admin
      )
      const d = data.draft
      // The model saw the source, the spec fields and the add-on groups.
      const prompt = calls[0].body.messages[1].content as string
      expect(calls[0].body.model).toBe("vendor/writer")
      expect(prompt).toContain("night vision up to 12 m")
      expect(prompt).toContain("resolution_mp")
      expect(prompt).toContain(memoryCards)

      expect(d.specs).toEqual({ resolution_mp: 2, night_vision: true }) // invented field dropped
      expect(d.notes.join(" ")).toContain("battery_life")
      expect(d.category_id).toBe(categoryId)
      expect(d.brand).toEqual({ id: brandId, name: "TP-Link" })
      expect(d.addon_group_ids).toEqual([memoryCards])
      expect(d.handle).toBe("tapo-c200-camera")
      expect(d.variants).toBeNull() // one colour is not a variant
      expect(d.content.faq).toHaveLength(1)
      expect(d.content.highlights_ar).toEqual(["دقة 1080p"])
      expect(d.questions[0].question_ar).toContain("تركيب")
    })

    it("refuses to read private addresses as the official page", async () => {
      const res = await api.post(
        "/admin/ai-products/draft",
        { name: "x1", source_url: "https://127.0.0.1/admin" },
        { ...admin, validateStatus: () => true }
      )
      expect(res.status).toBe(400)
      expect(calls).toHaveLength(0)
    })

    it("creates the product as a draft with its catalog data, then edits a photo and makes a video", async () => {
      const container = getContainer()
      const photo = await storeFile(container, "tapo-c200-1", { bytes: PNG, type: "image/png" })
      const enhanced = await api.post(
        "/admin/ai-products/images/enhance",
        { image_url: photo, style: "white", title: "Tapo C200", handle: "tapo-c200" },
        admin
      )
      expect(enhanced.data.url).toContain("tapo-c200-white")
      const imgCall = calls.find((c) => c.path === "/images")!
      expect(imgCall.body.model).toBe("vendor/img")
      expect(imgCall.body.input_references[0].image_url.url).toMatch(/^data:image\/png;base64,/)
      expect(imgCall.body.prompt).toContain("Keep the product exactly as it is")

      const created = await api.post(
        "/admin/ai-products/create",
        {
          handle: "tapo-c200",
          category_id: categoryId,
          brand_id: brandId,
          addon_group_ids: [memoryCards],
          price_kwd: 12.5,
          sku: "TAPO-C200",
          variants: null,
          images: [enhanced.data.url, photo],
          content: { title_ar: "كاميرا Tapo C200", title_en: "Tapo C200", seo_title_ar: "كاميرا Tapo C200", faq: [] },
          specs: { resolution_mp: 2 },
          source_url: "https://www.tapo.com/c200",
        },
        admin
      )
      const id = created.data.product.id
      const { data: p } = await api.get(`/admin/products/${id}?fields=status,handle,thumbnail,categories.id,variants.sku,variants.prices.*`, admin)
      expect(p.product).toMatchObject({ status: "draft", handle: "tapo-c200", thumbnail: enhanced.data.url })
      expect(p.product.categories[0].id).toBe(categoryId)
      expect(p.product.variants[0].sku).toBe("TAPO-C200")
      expect(p.product.variants[0].prices[0]).toMatchObject({ amount: 12.5, currency_code: "kwd" })

      const { data: cat } = await api.get(`/admin/catalog/products/${id}`, admin)
      expect(cat.catalog.detail).toMatchObject({ specs: { resolution_mp: 2 }, title_en: "Tapo C200", seo_title_ar: "كاميرا Tapo C200" })
      expect(cat.catalog.brand?.id ?? cat.catalog.brand_id).toBe(brandId)

      // A second product with the same handle gets its own.
      const again = await api.post(
        "/admin/ai-products/create",
        { handle: "tapo-c200", category_id: null, brand_id: null, price_kwd: 10, variants: null, images: [photo], content: { title_ar: "نسخة" } },
        admin
      )
      expect(again.data.product.handle).toBe("tapo-c200-2")

      // Video: start, poll until done, kept on the product.
      const started = await api.post(`/admin/ai-products/${id}/video`, {}, admin)
      expect(started.data.video).toMatchObject({ job_id: "vid1", status: "pending" })
      expect(calls.find((c) => c.path === "/videos")!.body.frame_images[0]).toMatchObject({ frame_type: "first_frame" })
      expect((await api.get(`/admin/ai-products/${id}/video`, admin)).data.video.status).toBe("in_progress")
      const done = (await api.get(`/admin/ai-products/${id}/video`, admin)).data.video
      expect(done.status).toBe("completed")
      expect(done.url).toMatch(/video.*\.mp4$/)
      const { data: meta } = await api.get(`/admin/products/${id}?fields=metadata`, admin)
      expect(meta.product.metadata.ai_video.url).toBe(done.url)
      expect(meta.product.metadata.video_url).toBeUndefined() // not on the store until reviewed
      await api.post(`/admin/ai-products/${id}/video/publish`, { publish: true }, admin)
      const { data: live } = await api.get(`/admin/products/${id}?fields=metadata`, admin)
      expect(live.product.metadata.video_url).toBe(done.url)
    })
  },
})
