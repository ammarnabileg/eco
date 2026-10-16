import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  getVariantAvailability,
  MedusaError,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils"

import { buildGoogleFeed, FeedItem, FeedLang } from "../../../../lib/google-merchant"

const COUNTRY = "kw"

// Shape Query returns for variants.calculated_price with a pricing context.
type CalculatedPrice = {
  calculated_amount: number | null
  original_amount: number | null
  calculated_price?: { price_list_id?: string | null; price_list_type?: string | null }
}

// Google Merchant Center product feed, one per language:
//   /feeds/google/ar  and  /feeds/google/en
// Merchant Center fetches it on a schedule. Public, read-only, published
// products only. Links point at the storefront (STOREFRONT_URL).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const lang = req.params.lang.replace(/\.xml$/, "") as FeedLang
  if (lang !== "ar" && lang !== "en") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Feed language must be ar or en")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const storefront = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  const absolute = (url?: string | null) =>
    !url ? undefined : url.startsWith("/") ? `${storefront}${url}` : url

  const [{ data: stores }, { data: regions }] = await Promise.all([
    query.graph({ entity: "store", fields: ["name", "default_sales_channel_id"] }),
    query.graph({ entity: "region", fields: ["id", "currency_code", "countries.iso_2"] }),
  ])
  const store = stores[0]
  const region = regions.find((r) => r.countries?.some((c) => c?.iso_2 === COUNTRY))
  if (!region || !store?.default_sales_channel_id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Kuwait region or sales channel missing")
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "title",
      "description",
      "thumbnail",
      "metadata",
      "images.url",
      "categories.name",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.ean",
      "variants.upc",
      "variants.barcode",
      "variants.calculated_price.*",
    ],
    filters: { status: ProductStatus.PUBLISHED },
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: region.id,
          currency_code: region.currency_code,
        }),
      },
    },
  })

  const variantIds = products.flatMap((p) => (p.variants ?? []).map((v) => v.id))
  const availability = variantIds.length
    ? await getVariantAvailability(query, {
        variant_ids: variantIds,
        sales_channel_id: store.default_sales_channel_id,
      })
    : {}

  const { data: priceLists } = await query.graph({
    entity: "price_list",
    fields: ["id", "starts_at", "ends_at"],
    filters: { status: "active" },
  })
  const listWindow = new Map(priceLists.map((pl) => [pl.id, pl]))

  const items: FeedItem[] = []
  for (const product of products) {
    const metadata = (product.metadata ?? {}) as Record<string, unknown>
    const title =
      lang === "en" && typeof metadata.en_title === "string" ? metadata.en_title : product.title
    const description =
      (lang === "en" && typeof metadata.en_description === "string"
        ? metadata.en_description
        : product.description) || title
    const variants = product.variants ?? []

    for (const variant of variants) {
      const price = (variant as unknown as { calculated_price?: CalculatedPrice })
        .calculated_price
      if (!price?.original_amount) {
        continue
      }
      const isSale = price.calculated_price?.price_list_type === "sale"
      const window = isSale ? listWindow.get(price.calculated_price?.price_list_id ?? "") : undefined
      const stock = availability[variant.id]?.availability
      const images = (product.images ?? []).map((i) => absolute(i?.url)).filter(Boolean) as string[]

      items.push({
        id: variant.sku || variant.id,
        itemGroupId: variants.length > 1 ? product.id : undefined,
        title: variants.length > 1 ? `${title} - ${variant.title}` : title,
        description,
        link: `${storefront}/${COUNTRY}/products/${product.handle}${variants.length > 1 ? `?v_id=${variant.id}` : ""}`,
        imageLink: absolute(product.thumbnail) ?? images[0],
        additionalImageLinks: images.slice(1),
        // null availability means inventory isn't managed: always sellable.
        availability: stock === null || (stock ?? 0) > 0 ? "in_stock" : "out_of_stock",
        price: Number(price.original_amount),
        salePrice: isSale ? Number(price.calculated_amount) : undefined,
        saleStartsAt: window?.starts_at ? new Date(window.starts_at).toISOString() : null,
        saleEndsAt: window?.ends_at ? new Date(window.ends_at).toISOString() : null,
        currency: region.currency_code,
        brand: typeof metadata.brand === "string" ? metadata.brand : undefined,
        gtin: variant.ean || variant.upc || variant.barcode || undefined,
        mpn: variant.sku || undefined,
        productType: product.categories?.[0]?.name,
      })
    }
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8")
  res.setHeader("Cache-Control", "public, max-age=3600")
  res.send(
    buildGoogleFeed({
      title: store.name ?? "Laly",
      link: storefront,
      description: lang === "ar" ? "منتجات Laly" : "Laly products",
      items,
    })
  )
}
