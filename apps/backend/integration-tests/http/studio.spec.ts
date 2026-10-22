import { createServer, Server } from "node:http"
import { unlink } from "node:fs/promises"
import { basename, join } from "node:path"
import { AddressInfo } from "node:net"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"

import { AI_MODULE } from "../../src/modules/ai"
import AiModuleService from "../../src/modules/ai/service"
import { stopStaleSlides } from "../../src/workflows/studio"

// The image studio's server side: backgrounds from a stand-in image model,
// ad copy, prices from the store (sale price lists included), approval that
// refuses a wrong price, and publishing as a homepage slide that ends with the
// offer or is switched off when the price changes.

jest.setTimeout(120 * 1000)

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
type Seen = { path: string; body: Record<string, unknown> }
const seen: Seen[] = []

let fake: Server
beforeAll(async () => {
  fake = createServer((req, res) => {
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      const body = JSON.parse(raw)
      seen.push({ path: req.url ?? "", body })
      res.setHeader("content-type", "application/json")
      const usage = { prompt_tokens: 100, completion_tokens: 50, cost: 0.004 }
      if (req.url?.endsWith("/images")) {
        res.end(JSON.stringify({ data: [{ b64_json: PNG, media_type: "image/png" }], usage }))
        return
      }
      const copy = {
        ar: { headline: "واي فاي أسرع لكل البيت", subtitle: "راوتر TP-Link بتغطية قوية", button: "اطلب الآن" },
        en: { headline: "Faster Wi-Fi at home", subtitle: "TP-Link router with strong coverage", button: "Shop now" },
      }
      res.end(JSON.stringify({ id: "gen", choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(copy) } }], usage }))
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
    let store: { headers: Record<string, string> }
    let productId: string
    let variantId: string

    beforeEach(async () => {
      seen.length = 0
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
      await api.post(
        "/admin/integrations/assistant",
        { enabled: true, values: { provider: "openrouter", openrouter_api_key: "sk-or", openrouter_model: "vendor/flash" } },
        admin
      )
      const { data } = await api.post(
        "/admin/products",
        {
          title: "TP-Link Archer AX55",
          handle: "archer-ax55",
          status: "published",
          options: [{ title: "Default", values: ["Default"] }],
          variants: [{ title: "Default", manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 12.9, currency_code: "kwd" }] }],
        },
        admin
      )
      productId = data.product.id
      variantId = data.product.variants[0].id
    })

    const design = (price: string, was?: string) => ({
      size: "banner",
      language: "ar",
      texts: [
        { id: "h", role: "headline", lang: "ar", text: "واي فاي أسرع لكل البيت" },
        { id: "p", role: "price", lang: "ar", text: price },
        ...(was ? [{ id: "w", role: "was", lang: "ar", text: was }] : []),
      ],
    })
    const saveBanner = async (elements: Record<string, unknown>, snapshot: unknown) =>
      (
        await api.post(
          "/admin/studio/banners",
          {
            title: "Archer AX55 sale",
            product_id: productId,
            canvas_width: 1920,
            canvas_height: 600,
            elements,
            language: "ar",
            price_snapshot: snapshot,
          },
          admin
        )
      ).data.banner

    it("generates a text-free background with the banner model and serves it from the backend for the canvas", async () => {
      const { data } = await api.post("/admin/studio/background", { size: "banner", style: "tech" }, admin)
      const call = seen.find((s) => s.path.endsWith("/images"))!
      expect(call.body.model).toBe("recraft/recraft-v4.1-flash")
      expect(call.body.aspect_ratio).toBe("16:9")
      expect(String(call.body.prompt)).toMatch(/no text/i)

      const image = await api.get(`/admin/studio/image?url=${encodeURIComponent(data.url)}`, { ...admin, responseType: "arraybuffer" })
      // Stored as WebP by the media settings' default.
      expect(image.headers["content-type"]).toBe("image/webp")
      expect(Buffer.from(image.data).subarray(8, 12).toString()).toBe("WEBP")
      await unlink(join(process.cwd(), "static", basename(data.url))).catch(() => undefined)

      const usage = await getContainer().resolve<AiModuleService>(AI_MODULE).listAiUsages({ task: "image_generate" })
      expect(usage).toHaveLength(1)
      expect(usage[0].cost_usd).toBeCloseTo(0.004)
    })

    it("suggests ad copy in both languages, recorded as marketing copy", async () => {
      const { data } = await api.post("/admin/studio/copy", { product_id: productId, brief: "عرض الويكند" }, admin)
      expect(data.copy.ar.headline).toBe("واي فاي أسرع لكل البيت")
      expect(data.copy.en.button).toBe("Shop now")
      const prompt = JSON.stringify(seen[0].body.messages)
      expect(prompt).toContain("TP-Link Archer AX55")
      expect(prompt).toMatch(/No prices/)
      expect(await getContainer().resolve<AiModuleService>(AI_MODULE).listAiUsages({ task: "marketing_copy" })).toHaveLength(1)
    })

    it("takes the sale price from the store, approves, publishes a slide that ends with the offer, and switches it off when the price changes", async () => {
      const endsAt = new Date(Date.now() + 3 * 86400000).toISOString()
      const { data: list } = await api.post(
        "/admin/price-lists",
        { title: "Weekend", description: "sale", type: "sale", status: "active", ends_at: endsAt, prices: [{ variant_id: variantId, amount: 9.9, currency_code: "kwd" }] },
        admin
      )
      const { data: priced } = await api.get(`/admin/studio/price?product_id=${productId}`, admin)
      expect(priced.price).toEqual({ amount: 9.9, original_amount: 12.9, currency_code: "kwd", price_list_id: list.price_list.id, ends_at: endsAt })

      // Arabic digits on the image are read as the same price.
      const banner = await saveBanner(design("٩٫٩٠٠ د.ك", "12.900 د.ك"), priced.price)
      expect(banner.status).toBe("draft")
      const { data: approved } = await api.post(`/admin/studio/banners/${banner.id}/approve`, { output_url: "https://cdn.example.com/b.png" }, admin)
      expect(approved.banner.status).toBe("approved")

      const { data: published } = await api.post("/admin/studio/slide", { banner_id: banner.id }, admin)
      expect(published.slide).toMatchObject({ banner_url: "https://cdn.example.com/b.png", cta_url: "/products/archer-ax55", title_ar: "واي فاي أسرع لكل البيت", is_active: true })
      expect(new Date(published.slide.ends_at).toISOString()).toBe(endsAt)
      const { data: content } = await api.get("/store/content", store)
      expect(content.hero_slides.map((s: { banner_url: string }) => s.banner_url)).toContain("https://cdn.example.com/b.png")

      // Publishing again updates the same slide.
      const { data: again } = await api.post("/admin/studio/slide", { banner_id: banner.id, cta_url: "/store" }, admin)
      expect(again.slide.id).toBe(published.slide.id)

      // The offer is removed early: publishing is refused and the hourly check switches the slide off.
      await api.delete(`/admin/price-lists/${list.price_list.id}`, admin)
      const refused = await api.post("/admin/studio/slide", { banner_id: banner.id }, admin).catch((e) => e.response)
      expect(refused.status).toBe(400)
      expect(refused.data.message).toContain("اتغيّر")
      expect(await stopStaleSlides(getContainer())).toEqual([banner.id])
      const { data: after } = await api.get(`/admin/studio/banners/${banner.id}`, admin)
      expect(after.banner.status).toBe("draft")
      expect(after.current_price.amount).toBe(12.9)
      const { data: liveContent } = await api.get("/store/content", store)
      expect(liveContent.hero_slides).toHaveLength(0)
      expect(await stopStaleSlides(getContainer())).toEqual([])
    })

    it("refuses to approve a price typed by hand or an old snapshot", async () => {
      const { data: priced } = await api.get(`/admin/studio/price?product_id=${productId}`, admin)
      expect(priced.price.amount).toBe(12.9)

      const typed = await saveBanner(design("8.000 د.ك"), priced.price)
      const wrong = await api.post(`/admin/studio/banners/${typed.id}/approve`, { output_url: "https://cdn.example.com/x.png" }, admin).catch((e) => e.response)
      expect(wrong.status).toBe(400)
      expect(wrong.data.message).toContain("مش مطابق")

      const unlinked = (
        await api.post(
          "/admin/studio/banners",
          { title: "No product", canvas_width: 1080, canvas_height: 1080, elements: design("5.000 د.ك"), language: "ar" },
          admin
        )
      ).data.banner
      const noProduct = await api.post(`/admin/studio/banners/${unlinked.id}/approve`, { output_url: "https://cdn.example.com/y.png" }, admin).catch((e) => e.response)
      expect(noProduct.status).toBe(400)

      const old = await saveBanner(design("11.000 د.ك"), { ...priced.price, amount: 11, original_amount: 11 })
      const stale = await api.post(`/admin/studio/banners/${old.id}/approve`, { output_url: "https://cdn.example.com/z.png" }, admin).catch((e) => e.response)
      expect(stale.status).toBe(400)
      expect(stale.data.message).toContain("سعر المنتج دلوقتي")

      // A slide needs an approved banner.
      const draft = await api.post("/admin/studio/slide", { banner_id: typed.id }, admin).catch((e) => e.response)
      expect(draft.status).toBe(400)
    })

    it("sends an edited banner back to draft and deletes it", async () => {
      const { data: priced } = await api.get(`/admin/studio/price?product_id=${productId}`, admin)
      const banner = await saveBanner(design("12.900 د.ك"), priced.price)
      await api.post(`/admin/studio/banners/${banner.id}/approve`, { output_url: "https://cdn.example.com/a.png" }, admin)
      const { data: edited } = await api.post(
        `/admin/studio/banners/${banner.id}`,
        { title: "Edited", product_id: productId, canvas_width: 1920, canvas_height: 600, elements: design("12.900 د.ك"), language: "ar", price_snapshot: priced.price },
        admin
      )
      expect(edited.banner).toMatchObject({ title: "Edited", status: "draft", output_url: null })
      const { data: listed } = await api.get("/admin/studio/banners", admin)
      expect(listed.banners).toHaveLength(1)
      await api.delete(`/admin/studio/banners/${banner.id}`, admin)
      expect((await api.get("/admin/studio/banners", admin)).data.banners).toHaveLength(0)
    })
  },
})
