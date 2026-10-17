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
    let productId: string
    let variantId: string
    let categoryId: string
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

      const { data: sc } = await api.post("/admin/sales-channels", { name: "Web" }, adminHeaders)
      const { data: key } = await api.post(
        "/admin/api-keys",
        { title: "store", type: "publishable" },
        adminHeaders
      )
      await api.post(
        `/admin/api-keys/${key.api_key.id}/sales-channels`,
        { add: [sc.sales_channel.id] },
        adminHeaders
      )
      storeHeaders = { headers: { "x-publishable-api-key": key.api_key.token } }

      const { data: region } = await api.post(
        "/admin/regions",
        { name: "Kuwait", currency_code: "kwd", countries: ["kw"] },
        adminHeaders
      )
      regionId = region.region.id

      const { data: category } = await api.post(
        "/admin/product-categories",
        { name: "كاميرات", handle: "cameras", is_active: true },
        adminHeaders
      )
      categoryId = category.product_category.id

      const { data } = await api.post(
        "/admin/products",
        {
          title: "كاميرا تجربة",
          status: "published",
          categories: [{ id: categoryId }],
          sales_channels: [{ id: sc.sales_channel.id }],
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              manage_inventory: false,
              options: { Default: "Default" },
              prices: [{ amount: 20, currency_code: "kwd" }],
            },
          ],
        },
        adminHeaders
      )
      productId = data.product.id
      variantId = data.product.variants[0].id

      await api.post(
        "/admin/catalog/spec-templates",
        {
          name_ar: "كاميرات IP",
          name_en: "IP cameras",
          category_ids: [categoryId],
          attributes: [
            { key: "resolution_mp", label_ar: "الدقة", label_en: "Resolution", type: "number", unit: "MP", filterable: true },
            {
              key: "night_vision",
              label_ar: "الرؤية الليلية",
              label_en: "Night vision",
              type: "select",
              filterable: true,
              options: [{ value: "colorvu", label_ar: "ملونة", label_en: "ColorVu" }],
            },
          ],
        },
        adminHeaders
      )
    })

    const addonGroup = async () => {
      const { data } = await api.post(
        "/admin/catalog/addon-groups",
        {
          name_ar: "هارد مراقبة",
          name_en: "Surveillance HDD",
          kind: "hdd",
          options: [
            { name_ar: "1 تيرا", name_en: "1TB", price: 17.5 },
            { name_ar: "2 تيرا", name_en: "2TB", price: 24.9 },
          ],
        },
        adminHeaders
      )
      return data.addon_group
    }

    const newCart = async () => {
      const { data } = await api.post("/store/carts", { region_id: regionId }, storeHeaders)
      return data.cart.id as string
    }

    it("validates specs against the category template and exposes them on the store", async () => {
      const bad = await api
        .post(`/admin/catalog/products/${productId}`, { detail: { specs: { resolution_mp: "x", colour: "red" } } }, adminHeaders)
        .catch((e) => e.response)
      expect(bad.status).toEqual(400)
      expect(bad.data.message).toContain("Resolution")
      expect(bad.data.message).toContain('"colour"')

      const { data: brand } = await api.post(
        "/admin/catalog/brands",
        { name: "Hikvision", handle: "hikvision" },
        adminHeaders
      )
      const { data } = await api.post(
        `/admin/catalog/products/${productId}`,
        {
          brand_id: brand.brand.id,
          detail: { title_en: "Test camera", specs: { resolution_mp: "4", night_vision: "colorvu" } },
        },
        adminHeaders
      )
      expect(data.catalog.detail.specs).toEqual({ resolution_mp: 4, night_vision: "colorvu" })
      expect(data.catalog.attributes.map((a) => a.key)).toEqual(["resolution_mp", "night_vision"])

      const { data: store } = await api.get(
        `/store/products/${productId}?fields=${encodeURIComponent("id,+brand.*,+product_detail.*")}`,
        storeHeaders
      )
      expect(store.product.brand.name).toEqual("Hikvision")
      expect(store.product.product_detail.title_en).toEqual("Test camera")

      const { data: filters } = await api.get(`/store/catalog/filters?category_id=${categoryId}`, storeHeaders)
      expect(filters.attributes.map((a) => a.key)).toEqual(["resolution_mp", "night_vision"])
    })

    it("prices add-ons on the server and merges identical configurations", async () => {
      const group = await addonGroup()
      await api.post(`/admin/catalog/products/${productId}`, { addon_group_ids: [group.id] }, adminHeaders)
      const cartId = await newCart()
      const option = group.options.find((o) => o.name_en === "1TB")

      const add = (quantity: number) =>
        api.post(
          `/store/carts/${cartId}/configured-items`,
          { variant_id: variantId, quantity, addon_option_ids: [option.id] },
          storeHeaders
        )
      await add(2)
      const { data } = await add(1)
      expect(data.cart.items).toHaveLength(1)
      expect(data.cart.items[0].unit_price).toEqual(37.5)
      expect(data.cart.items[0].quantity).toEqual(3)
      expect(data.cart.items[0].metadata.addons[0].name_en).toEqual("1TB")

      const both = await api
        .post(
          `/store/carts/${cartId}/configured-items`,
          { variant_id: variantId, quantity: 1, addon_option_ids: group.options.map((o) => o.id) },
          storeHeaders
        )
        .catch((e) => e.response)
      expect(both.status).toEqual(400)
    })

    it("blocks free add-ons and price-on-request products on the core cart route", async () => {
      const cartId = await newCart()
      const forged = await api
        .post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: variantId, quantity: 1, metadata: { addons: [{ name_en: "2TB", price: 0 }] } },
          storeHeaders
        )
        .catch((e) => e.response)
      expect(forged.status).toEqual(400)

      await api.post(`/admin/catalog/products/${productId}`, { detail: { price_on_request: true } }, adminHeaders)
      const quoted = await api
        .post(`/store/carts/${cartId}/line-items`, { variant_id: variantId, quantity: 1 }, storeHeaders)
        .catch((e) => e.response)
      expect(quoted.status).toEqual(400)
      expect(quoted.data.message).toContain("quotation")
    })

    it("stores quote requests and lets staff move them along", async () => {
      const { data } = await api.post(
        "/store/quote-requests",
        { product_id: productId, customer_name: "أحمد", phone: "+965 9999 1234", quantity: 10 },
        storeHeaders
      )
      expect(data.quote_request.status).toEqual("new")

      const bot = await api
        .post(
          "/store/quote-requests",
          { product_id: productId, customer_name: "Bot", phone: "99999999", website: "spam" },
          storeHeaders
        )
        .catch((e) => e.response)
      expect(bot.status).toEqual(400)

      const { data: list } = await api.get("/admin/catalog/quote-requests", adminHeaders)
      expect(list.count).toEqual(1)
      expect(list.quote_requests[0].product_title).toEqual("كاميرا تجربة")

      const { data: updated } = await api.post(
        `/admin/catalog/quote-requests/${data.quote_request.id}`,
        { status: "contacted", admin_note: "اتصلنا" },
        adminHeaders
      )
      expect(updated.quote_request.status).toEqual("contacted")
    })
  },
})
