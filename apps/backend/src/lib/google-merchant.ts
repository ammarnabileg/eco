// Builds a Google Merchant Center product feed (RSS 2.0 with the g: namespace).
// Spec: https://support.google.com/merchants/answer/7052112

export type FeedLang = "ar" | "en"

export type FeedItem = {
  id: string
  itemGroupId?: string
  title: string
  description: string
  link: string
  imageLink?: string
  additionalImageLinks?: string[]
  availability: "in_stock" | "out_of_stock"
  price: number
  salePrice?: number
  saleEndsAt?: string | null
  saleStartsAt?: string | null
  currency: string
  brand?: string
  gtin?: string
  mpn?: string
  productType?: string
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are invalid in XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")

// KWD has 3 decimals: "74.900 KWD".
export const formatPrice = (amount: number, currency: string) => {
  const decimals = currency.toUpperCase() === "KWD" ? 3 : 2
  return `${amount.toFixed(decimals)} ${currency.toUpperCase()}`
}

const tag = (name: string, value: string | undefined | null) =>
  value ? `      <g:${name}>${escapeXml(value)}</g:${name}>\n` : ""

export function buildGoogleFeed({
  title,
  link,
  description,
  items,
}: {
  title: string
  link: string
  description: string
  items: FeedItem[]
}) {
  const body = items
    .map((item) => {
      const hasIdentifier = !!item.gtin || (!!item.mpn && !!item.brand)
      const saleWindow =
        item.salePrice !== undefined && (item.saleStartsAt || item.saleEndsAt)
          ? `${item.saleStartsAt ?? new Date(0).toISOString()}/${item.saleEndsAt ?? "2099-12-31T23:59:59Z"}`
          : undefined

      return (
        "    <item>\n" +
        tag("id", item.id) +
        tag("item_group_id", item.itemGroupId) +
        tag("title", item.title.slice(0, 150)) +
        tag("description", item.description.slice(0, 5000)) +
        tag("link", item.link) +
        tag("image_link", item.imageLink) +
        (item.additionalImageLinks ?? [])
          .slice(0, 10)
          .map((url) => tag("additional_image_link", url))
          .join("") +
        tag("availability", item.availability) +
        tag("price", formatPrice(item.price, item.currency)) +
        (item.salePrice !== undefined && item.salePrice < item.price
          ? tag("sale_price", formatPrice(item.salePrice, item.currency)) +
            tag("sale_price_effective_date", saleWindow)
          : "") +
        tag("condition", "new") +
        tag("brand", item.brand) +
        tag("gtin", item.gtin) +
        tag("mpn", item.mpn) +
        (hasIdentifier ? "" : tag("identifier_exists", "no")) +
        tag("product_type", item.productType) +
        "    </item>\n"
      )
    })
    .join("")

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    "  <channel>\n" +
    `    <title>${escapeXml(title)}</title>\n` +
    `    <link>${escapeXml(link)}</link>\n` +
    `    <description>${escapeXml(description)}</description>\n` +
    body +
    "  </channel>\n" +
    "</rss>\n"
  )
}
