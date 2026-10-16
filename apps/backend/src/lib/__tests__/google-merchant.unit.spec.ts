import { buildGoogleFeed, formatPrice } from "../google-merchant"

describe("Google Merchant feed", () => {
  it("formats KWD with three decimals", () => {
    expect(formatPrice(74.9, "kwd")).toBe("74.900 KWD")
    expect(formatPrice(3.5, "KWD")).toBe("3.500 KWD")
    expect(formatPrice(10, "usd")).toBe("10.00 USD")
  })

  const base = {
    id: "SKU-1",
    title: "كاميرا <Hikvision> & \"2MP\"",
    description: "وصف",
    link: "https://laly.example/kw/products/cam",
    availability: "in_stock" as const,
    price: 17.5,
    currency: "kwd",
  }

  it("escapes XML and emits sale price with its real window", () => {
    const xml = buildGoogleFeed({
      title: "Laly",
      link: "https://laly.example",
      description: "feed",
      items: [
        {
          ...base,
          brand: "Hikvision",
          mpn: "SKU-1",
          salePrice: 12.5,
          saleStartsAt: "2026-10-01T00:00:00.000Z",
          saleEndsAt: "2026-10-30T00:00:00.000Z",
        },
      ],
    })
    expect(xml).toContain("كاميرا &lt;Hikvision&gt; &amp; &quot;2MP&quot;")
    expect(xml).toContain("<g:price>17.500 KWD</g:price>")
    expect(xml).toContain("<g:sale_price>12.500 KWD</g:sale_price>")
    expect(xml).toContain(
      "<g:sale_price_effective_date>2026-10-01T00:00:00.000Z/2026-10-30T00:00:00.000Z</g:sale_price_effective_date>"
    )
    expect(xml).not.toContain("identifier_exists")
  })

  it("flags items with no product identifiers", () => {
    const xml = buildGoogleFeed({
      title: "Laly",
      link: "https://laly.example",
      description: "feed",
      items: [base],
    })
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>")
    expect(xml).not.toContain("sale_price")
  })
})
