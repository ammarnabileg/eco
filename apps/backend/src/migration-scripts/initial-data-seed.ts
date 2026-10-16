import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

// Laly launch data: one Kuwait region in KWD, the store's categories, and the
// catalogue from the approved design. Prices are in KWD major units (12.5 = 12.500 KD).
// Product images point at illustrations served by the storefront (/products/*.svg);
// replace them with real photos from the admin.

const CATEGORIES = [
  { handle: "cctv", name: "كاميرات المراقبة", en: "CCTV Cameras" },
  { handle: "networking", name: "الشبكات", en: "Networking" },
  { handle: "smart-home", name: "البيت الذكي", en: "Smart Home" },
  { handle: "storage", name: "التخزين", en: "Storage" },
  { handle: "laptops", name: "لابتوبات وتابلت", en: "Laptops & Tablets" },
  { handle: "accessories", name: "إكسسوارات", en: "Accessories" },
  { handle: "monitors", name: "شاشات وبروجكترات", en: "Monitors & Projectors" },
] as const

type CategoryHandle = (typeof CATEGORIES)[number]["handle"]

type SeedProduct = {
  handle: string
  title: string
  en: string
  brand: string
  category: CategoryHandle
  // Products on sale (compareAt) appear in the weekly offer price list.
  collection?: "best-sellers"
  art: string
  price: number
  // Regular price when the product is on sale; `price` becomes the sale price.
  compareAt?: number
}

const PRODUCTS: SeedProduct[] = [
  { handle: "hikvision-2mp-bullet", title: "كاميرا Hikvision Bullet دقة 2MP", en: "Hikvision 2MP Bullet Camera", brand: "Hikvision", category: "cctv", art: "bullet", price: 12.5, compareAt: 17.5 },
  { handle: "surveillance-hdd-1tb", title: "هارد مراقبة 1TB Surveillance", en: "1TB Surveillance Hard Drive", brand: "Western Digital", category: "storage", art: "hdd", price: 12.9, compareAt: 15.9 },
  { handle: "jbl-tune-520bt", title: "سماعات JBL Tune 520BT", en: "JBL Tune 520BT Headphones", brand: "JBL", category: "accessories", art: "headphones", price: 13.9, compareAt: 18.5 },
  { handle: "tapo-c200", title: "كاميرا Tapo C200 منزلية Wi-Fi", en: "TP-Link Tapo C200 Wi-Fi Camera", brand: "TP-Link", category: "cctv", art: "ptz", price: 9.9, compareAt: 13.9 },
  { handle: "hikvision-2mp-kit-4", title: "طقم Hikvision كامل — 4 كاميرات 2MP", en: "Hikvision 2MP CCTV Kit — 4 Cameras", brand: "Hikvision", category: "cctv", collection: "best-sellers", art: "kit", price: 74.9, compareAt: 89.9 },
  { handle: "hikvision-4mp-dome", title: "كاميرا Hikvision Dome دقة 4MP", en: "Hikvision 4MP Turbo Dome Camera", brand: "Hikvision", category: "cctv", collection: "best-sellers", art: "dome", price: 18.9, compareAt: 24.9 },
  { handle: "tp-link-archer-c6", title: "راوتر TP-Link Archer C6 AC1200", en: "TP-Link Archer C6 AC1200 Router", brand: "TP-Link", category: "networking", collection: "best-sellers", art: "router", price: 12.9 },
  { handle: "tapo-l530e", title: "لمبة Tapo L530E ذكية Wi-Fi", en: "Tapo L530E Smart Wi-Fi Bulb", brand: "TP-Link", category: "smart-home", collection: "best-sellers", art: "bulb", price: 3.5, compareAt: 4.9 },
  { handle: "d-link-cat6-305m", title: "كيبل شبكة D-Link CAT6 (305م)", en: "D-Link CAT6 Network Cable (305m)", brand: "D-Link", category: "networking", collection: "best-sellers", art: "cable", price: 8.25 },
  { handle: "hikvision-dvr-4ch", title: "جهاز تسجيل Hikvision DVR — 4 قنوات", en: "Hikvision 4-Channel Turbo DVR", brand: "Hikvision", category: "cctv", collection: "best-sellers", art: "dvr", price: 22.9 },
]

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("Seeding store data...")
  const {
    result: [salesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [{ name: "Laly Online", description: "laly storefront" }],
    },
  })

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [salesChannel.id] },
  })

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Laly",
          supported_currencies: [{ currency_code: "kwd", is_default: true }],
          default_sales_channel_id: salesChannel.id,
        },
      ],
    },
  })

  logger.info("Seeding region data...")
  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Kuwait",
          currency_code: "kwd",
          countries: ["kw"],
          // Kuwait has no VAT; prices are final.
          automatic_taxes: true,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "kw", provider_id: "tp_system" }],
  })

  logger.info("Seeding stock location and fulfillment data...")
  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "Hawally Warehouse",
          address: { city: "Hawally", country_code: "KW", address_1: "Tunis St" },
        },
      ],
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })

  // Created by a core migration script.
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Kuwait delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Kuwait",
        geo_zones: [{ country_code: "kw", type: "country" }],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  const shippingRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ]

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "توصيل عادي",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "Delivery in 1-2 days.", code: "standard" },
        prices: [
          { currency_code: "kwd", amount: 1.5 },
          { region_id: region.id, amount: 1.5 },
        ],
        rules: shippingRules,
      },
      {
        name: "توصيل سريع",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Express", description: "Same-day delivery.", code: "express" },
        prices: [
          { currency_code: "kwd", amount: 3 },
          { region_id: region.id, amount: 3 },
        ],
        rules: shippingRules,
      },
    ],
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  })

  logger.info("Seeding catalogue...")
  const { result: categories } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: CATEGORIES.map((c, rank) => ({
        name: c.name,
        handle: c.handle,
        is_active: true,
        rank,
        metadata: { en_name: c.en },
      })),
    },
  })

  const { result: collections } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        { title: "الأكثر مبيعاً هذا الأسبوع", handle: "best-sellers", metadata: { en_title: "Best sellers this week" } },
      ],
    },
  })

  const {
    result: [defaultOption],
  } = await createProductOptionsWorkflow(container).run({
    input: { product_options: [{ title: "Default", values: ["Default"] }] },
  })

  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: PRODUCTS.map((p) => ({
        title: p.title,
        handle: p.handle,
        status: ProductStatus.PUBLISHED,
        thumbnail: `/products/${p.art}.svg`,
        images: [{ url: `/products/${p.art}.svg` }],
        category_ids: [categories.find((c) => c.handle === p.category)!.id],
        collection_id: p.collection
          ? collections.find((c) => c.handle === p.collection)!.id
          : undefined,
        shipping_profile_id: shippingProfile.id,
        metadata: { en_title: p.en, brand: p.brand },
        options: [{ id: defaultOption.id }],
        variants: [
          {
            title: "Default",
            sku: p.handle.toUpperCase(),
            manage_inventory: true,
            options: { Default: "Default" },
            prices: [{ amount: p.compareAt ?? p.price, currency_code: "kwd" }],
          },
        ],
        sales_channels: [{ id: salesChannel.id }],
      })),
    },
  })

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.handle"],
    filters: { product_id: products.map((p) => p.id) },
  })

  const salePrices = PRODUCTS.filter((p) => p.compareAt).map((p) => ({
    variant_id: variants.find((v) => v.product?.handle === p.handle)!.id,
    amount: p.price,
    currency_code: "kwd",
  }))

  await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        {
          title: "عروض الأسبوع",
          description: "خصومات حقيقية لفترة محدودة",
          status: "active",
          // Real end date: Medusa stops applying these prices afterwards and
          // the storefront countdown ends at the same moment.
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          prices: salePrices,
        },
      ],
    },
  })

  logger.info("Seeding inventory levels...")
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 50,
        inventory_item_id: item.id,
      })),
    },
  })

  logger.info("Finished seeding Laly data.")
}
