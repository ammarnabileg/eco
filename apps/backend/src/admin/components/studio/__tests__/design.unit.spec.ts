import { applyPrice, defaultDesign, reflow, discountPercent, formatPrice, hitTest, layoutText, TextEl, toArabicDigits, wrapText } from "../design"

// A fixed-width "font": every character is 10px at 20px, scaled with the size.
const measure = (font: string, s: string) => s.length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]) * 0.5
const price = { amount: 9.9, original_amount: 12.9, currency_code: "kwd", price_list_id: "plist_1", ends_at: null }
const copy = {
  ar: { headline: "راوتر TP-Link بسرعة 5G", subtitle: "إنترنت أسرع لكل البيت", button: "اطلب الآن" },
  en: { headline: "TP-Link 5G router", subtitle: "Faster internet at home", button: "Shop now" },
}

describe("studio design", () => {
  it("formats Kuwaiti prices with 3 decimals, Arabic digits on request", () => {
    expect(formatPrice(12.9, "en")).toBe("KWD 12.900")
    expect(formatPrice(12.9, "ar")).toBe("12.900 د.ك")
    expect(formatPrice(12.9, "ar", true)).toBe("١٢٫٩٠٠ د.ك")
    expect(toArabicDigits("Wi-Fi 6 بـ 25.5")).toBe("Wi-Fi ٦ بـ ٢٥٫٥")
  })

  it("computes the discount only when the price is really lower", () => {
    expect(discountPercent(price)).toBe(23)
    expect(discountPercent({ ...price, amount: 12.9 })).toBe(0)
  })

  it("wraps mixed Arabic and English words without splitting a word", () => {
    const lines = wrapText("راوتر TP-Link Archer AX55 بسرعة عالية", 120, (s) => s.length * 10)
    expect(lines.join(" ")).toBe("راوتر TP-Link Archer AX55 بسرعة عالية")
    expect(lines.every((l) => l.length * 10 <= 120 || !l.includes(" "))).toBe(true)
    expect(lines.length).toBeGreaterThan(1)
  })

  it("shrinks a headline until it fits two lines", () => {
    const el: TextEl = { id: "h", role: "headline", lang: "ar", text: "عرض خاص على راوتر TP-Link بسرعة 5G لكل البيت والمكتب", x: 0, y: 0, w: 0.5, size: 0.1, color: "#fff", weight: 800, align: "start" }
    const out = layoutText(el, 1080, 1080, measure)
    expect(out.lines.length).toBeLessThanOrEqual(2)
    expect(out.px).toBeLessThan(108)
    expect(out.font).toContain('"Tajawal"')
    expect(out.lines.every((l) => measure(out.font, l) <= 540)).toBe(true)
  })

  it("lays out a bilingual banner with price, old price, badge and button", () => {
    const d = defaultDesign({ size: "banner", language: "both", copy, price, productUrl: "https://x/p.png", arabicDigits: true })
    const roles = d.texts.map((t) => `${t.role}:${t.lang}`)
    expect(roles).toEqual(["headline:ar", "subtitle:ar", "headline:en", "price:ar", "was:ar", "badge:ar", "button:ar"])
    expect(d.texts.find((t) => t.role === "price")!.text).toBe("٩٫٩٠٠ د.ك")
    expect(d.texts.find((t) => t.role === "badge")!.text).toBe("خصم ٢٣%")
    expect(d.product.card).toBe(true)
    for (const t of d.texts) {
      expect(t.x).toBeGreaterThanOrEqual(0)
      expect(t.x + t.w).toBeLessThanOrEqual(1)
      expect(t.y).toBeLessThan(1)
    }
  })

  it("puts an English-only design's text on the left and leaves the price out when there is none", () => {
    const d = defaultDesign({ size: "banner", language: "en", copy })
    expect(d.product.x).toBeGreaterThan(0.5)
    expect(d.texts.some((t) => t.role === "price")).toBe(false)
    expect(d.texts.every((t) => t.lang === "en")).toBe(true)
  })

  it("re-stacks the column so a wrapped headline never overlaps the next line", () => {
    const long = { ...copy, ar: { ...copy.ar, headline: "عرض خاص على راوتر TP-Link بسرعة 5G لكل البيت والمكتب والعائلة" } }
    const d = reflow(defaultDesign({ size: "square", language: "ar", copy: long, price }), measure)
    const column = d.texts.filter((t) => t.role !== "badge")
    for (let i = 1; i < column.length; i++) {
      const prev = layoutText(column[i - 1], 1080, 1080, measure)
      expect(column[i].y * 1080).toBeGreaterThanOrEqual(column[i - 1].y * 1080 + prev.px * 1.3 * prev.lines.length)
    }
    expect(column[column.length - 1].y).toBeLessThan(1)
  })

  it("shrinks the column until the last element, button included, ends inside the canvas", () => {
    const long = { ...copy, en: { headline: "TP-Link Archer AX55 Wi-Fi 6 dual band gigabit router", subtitle: "Stronger coverage for every room of the house", button: "Shop now" } }
    const d = reflow(defaultDesign({ size: "square", language: "en", copy: long, price }), measure)
    const button = d.texts.find((t) => t.role === "button")!
    const out = layoutText(button, 1080, 1080, measure)
    expect(button.y * 1080 + out.px * 1.3 + out.px * 0.4).toBeLessThanOrEqual(1080 * 0.95 + 1)
  })

  it("keeps the English line of a bilingual banner on the Arabic side", () => {
    const d = defaultDesign({ size: "banner", language: "both", copy, price })
    expect(d.texts.find((t) => t.role === "headline" && t.lang === "en")!.align).toBe("end")
    const badge = d.texts.find((t) => t.role === "badge")!
    expect(badge.x + badge.w).toBeCloseTo(d.product.x + d.product.w - 0.01)
  })

  it("rewrites the price texts from the store's price and drops the sale parts when the sale ends", () => {
    const d = defaultDesign({ size: "square", language: "ar", copy, price })
    const sale = applyPrice(d, { ...price, amount: 8.5 })
    expect(sale.texts.find((t) => t.role === "price")!.text).toBe("8.500 د.ك")
    expect(sale.texts.find((t) => t.role === "badge")!.text).toBe("خصم 34%")
    const ended = applyPrice(d, { ...price, amount: 12.9, price_list_id: null })
    expect(ended.texts.find((t) => t.role === "price")!.text).toBe("12.900 د.ك")
    expect(ended.texts.some((t) => t.role === "was" || t.role === "badge")).toBe(false)
    expect(applyPrice(d, null).texts.some((t) => t.role === "price")).toBe(false)
  })

  it("hit-tests the topmost box", () => {
    const boxes = [
      { id: "product", x: 0, y: 0, w: 100, h: 100 },
      { id: "badge", x: 10, y: 10, w: 20, h: 20 },
    ]
    expect(hitTest(boxes, 15, 15)).toBe("badge")
    expect(hitTest(boxes, 80, 80)).toBe("product")
    expect(hitTest(boxes, 200, 200)).toBeNull()
  })
})
