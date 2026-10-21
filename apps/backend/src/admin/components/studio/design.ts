// The studio's design model and canvas drawing. Everything about a banner is
// data (`Design`), stored with fractions of the canvas, so a design can be
// reopened, edited and exported again without any model call. Drawing uses the
// browser's own text engine, which shapes Arabic and orders mixed RTL/LTR text.

export const SIZES = {
  square: { width: 1080, height: 1080, label: "مربع 1080×1080" },
  post: { width: 1080, height: 1350, label: "منشور 1080×1350" },
  story: { width: 1080, height: 1920, label: "ستوري 1080×1920" },
  banner: { width: 1920, height: 600, label: "بانر 1920×600" },
} as const
export type SizeKey = keyof typeof SIZES
export type Lang = "ar" | "en"
export type Language = Lang | "both"

export type Role = "headline" | "subtitle" | "price" | "was" | "badge" | "button"

export type TextEl = {
  id: string
  role: Role
  lang: Lang
  text: string
  /** Box position and width, as fractions of the canvas. */
  x: number
  y: number
  w: number
  /** Font size as a fraction of the canvas's shorter side. */
  size: number
  color: string
  weight: 400 | 700 | 800
  align: "start" | "center" | "end"
  /** Pill background (buttons, badges). */
  bg?: string | null
}

export type Design = {
  size: SizeKey
  language: Language
  background: { url: string | null; color: string; overlay: number }
  product: { url: string | null; x: number; y: number; w: number; h: number; card: boolean }
  texts: TextEl[]
  arabicDigits: boolean
}

export type Price = { amount: number; original_amount: number; currency_code: string; price_list_id: string | null; ends_at: string | null }
export type Copy = { headline: string; subtitle: string; button: string }

export const BRAND = { ink: "#14262C", teal: "#0E4652", sand: "#E9B949", white: "#FFFFFF", red: "#D64545" }
export const FONTS: Record<Lang, string> = { ar: "Tajawal", en: "Poppins" }

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"
export const toArabicDigits = (s: string) => s.replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]).replace(/(\d|[٠-٩])\.(\d|[٠-٩])/g, "$1٫$2")

/** Kuwaiti dinar with 3 decimals: "12.900 د.ك" / "KWD 12.900". */
export function formatPrice(amount: number, lang: Lang, arabicDigits = false) {
  const n = amount.toFixed(3)
  if (lang === "en") return `KWD ${n}`
  return `${arabicDigits ? toArabicDigits(n) : n} د.ك`
}

export const discountPercent = (p: Price) =>
  p.original_amount > p.amount ? Math.round((1 - p.amount / p.original_amount) * 100) : 0

const id = () => Math.random().toString(36).slice(2, 10)

/**
 * A starting layout: product photo on one side (or on top for tall sizes),
 * text on the other, Arabic aligned right and English left. Everything can be
 * moved and resized afterwards.
 */
export function defaultDesign(input: {
  size: SizeKey
  language: Language
  copy: Partial<Record<Lang, Copy>>
  price?: Price | null
  productUrl?: string | null
  backgroundUrl?: string | null
  arabicDigits?: boolean
}): Design {
  const wide = input.size === "banner"
  const langs: Lang[] = input.language === "both" ? ["ar", "en"] : [input.language]
  const rtlFirst = langs[0] === "ar"
  const product = wide
    ? { x: rtlFirst ? 0.05 : 0.65, y: 0.1, w: 0.3, h: 0.8, card: true }
    : { x: 0.14, y: 0.06, w: 0.72, h: input.size === "story" ? 0.36 : 0.42, card: true }
  const box = wide ? { x: rtlFirst ? 0.4 : 0.05, w: 0.55 } : { x: 0.07, w: 0.86 }
  const align: TextEl["align"] = wide ? "start" : "center"
  let y = wide ? 0.12 : product.y + product.h + 0.04
  const texts: TextEl[] = []
  const push = (el: Omit<TextEl, "id" | "x" | "w" | "y">, gap: number) => {
    texts.push({ ...el, id: id(), x: box.x, w: box.w, y })
    y += gap
  }
  const scale = (wide ? 1 : 0.8) / (langs.length > 1 ? 1.25 : 1)
  langs.forEach((lang, i) => {
    const c = input.copy[lang] ?? { headline: "", subtitle: "", button: "" }
    const second = i > 0
    // In a bilingual banner the English line sits on the Arabic side ("end" of a left-to-right line).
    const side: TextEl["align"] = second && wide ? "end" : align
    if (c.headline) push({ role: "headline", lang, text: c.headline, size: (second ? 0.065 : 0.1) * scale, color: BRAND.white, weight: 800, align: side }, (second ? 0.08 : 0.14) * scale * (wide ? 1.4 : 1))
    if (c.subtitle && !second) push({ role: "subtitle", lang, text: c.subtitle, size: 0.05 * scale, color: "#D7E6E9", weight: 400, align }, 0.12 * scale * (wide ? 1.4 : 1))
  })
  const main = langs[0]
  if (input.price) {
    const digits = !!input.arabicDigits && main === "ar"
    push({ role: "price", lang: main, text: formatPrice(input.price.amount, main, digits), size: 0.075 * scale, color: BRAND.sand, weight: 800, align }, 0.09 * scale * (wide ? 1.4 : 1))
    const off = discountPercent(input.price)
    if (off > 0) {
      push({ role: "was", lang: main, text: formatPrice(input.price.original_amount, main, digits), size: 0.045 * scale, color: "#B9D3D8", weight: 400, align }, 0.07 * scale * (wide ? 1.4 : 1))
      texts.push({
        id: id(),
        role: "badge",
        lang: main,
        text: main === "ar" ? `خصم ${digits ? toArabicDigits(String(off)) : off}%` : `-${off}%`,
        x: main === "ar" ? product.x + product.w - 0.21 : product.x + 0.01,
        y: product.y + 0.02,
        w: 0.2,
        size: 0.045 * scale,
        color: BRAND.white,
        weight: 800,
        align: "start",
        bg: BRAND.red,
      })
    }
  }
  const button = input.copy[main]?.button
  if (button) push({ role: "button", lang: main, text: button, size: 0.045 * scale, color: BRAND.ink, weight: 700, align, bg: BRAND.sand }, 0)

  return {
    size: input.size,
    language: input.language,
    background: { url: input.backgroundUrl ?? null, color: BRAND.teal, overlay: input.backgroundUrl ? 0.35 : 0 },
    product: { url: input.productUrl ?? null, ...product },
    texts,
    arabicDigits: !!input.arabicDigits,
  }
}

/** Words into lines that fit `maxWidth`; a single long word stays on its own line. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    let line = ""
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (line && measure(next) > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    lines.push(line)
  }
  return lines
}

const MAX_LINES: Record<Role, number> = { headline: 2, subtitle: 3, price: 1, was: 1, badge: 1, button: 1 }
export type Box = { id: string; x: number; y: number; w: number; h: number }

const fontFor = (el: TextEl, px: number) => `${el.weight} ${px}px "${FONTS[el.lang]}", sans-serif`

/** Lines and font size of a text element, shrinking until it fits its box. */
export function layoutText(el: TextEl, W: number, H: number, measure: (font: string, s: string) => number) {
  const boxW = el.w * W
  let px = Math.max(8, el.size * Math.min(W, H))
  for (let i = 0; i < 30; i++) {
    const font = fontFor(el, px)
    const lines = wrapText(el.text, el.bg ? boxW * 0.8 : boxW, (s) => measure(font, s))
    if (lines.length <= MAX_LINES[el.role] && lines.every((l) => measure(font, l) <= boxW)) return { px, font, lines }
    px *= 0.92
  }
  const font = fontFor(el, px)
  return { px, font, lines: wrapText(el.text, boxW, (s) => measure(font, s)).slice(0, MAX_LINES[el.role]) }
}

/** The topmost element under a point (canvas pixels), product photo included. */
export function hitTest(boxes: Box[], x: number, y: number) {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i]
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id
  }
  return null
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draws the design; returns the element boxes for dragging. */
export function drawDesign(
  ctx: CanvasRenderingContext2D,
  design: Design,
  images: { background?: HTMLImageElement | null; product?: HTMLImageElement | null }
): Box[] {
  const { width: W, height: H } = SIZES[design.size]
  const boxes: Box[] = []
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = design.background.color
  ctx.fillRect(0, 0, W, H)

  const bg = images.background
  if (bg && bg.naturalWidth) {
    // Cover: fill the canvas, crop the overflow evenly.
    const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight)
    const w = bg.naturalWidth * s
    const h = bg.naturalHeight * s
    ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h)
    if (design.background.overlay > 0) {
      ctx.fillStyle = `rgba(10, 30, 36, ${design.background.overlay})`
      ctx.fillRect(0, 0, W, H)
    }
  }

  const p = design.product
  const px = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H }
  const img = images.product
  if (img && img.naturalWidth) {
    let inner = px
    if (p.card) {
      ctx.save()
      ctx.shadowColor = "rgba(0,0,0,0.25)"
      ctx.shadowBlur = Math.min(W, H) * 0.04
      ctx.shadowOffsetY = Math.min(W, H) * 0.012
      ctx.fillStyle = BRAND.white
      roundRect(ctx, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.06)
      ctx.fill()
      ctx.restore()
      const pad = Math.min(px.w, px.h) * 0.07
      inner = { x: px.x + pad, y: px.y + pad, w: px.w - 2 * pad, h: px.h - 2 * pad }
    }
    // Contain: the whole product, never cropped or stretched.
    const s = Math.min(inner.w / img.naturalWidth, inner.h / img.naturalHeight)
    const w = img.naturalWidth * s
    const h = img.naturalHeight * s
    ctx.drawImage(img, inner.x + (inner.w - w) / 2, inner.y + (inner.h - h) / 2, w, h)
    boxes.push({ id: "product", ...px })
  }

  for (const el of design.texts) {
    if (!el.text.trim()) continue
    const { px: size, font, lines } = layoutText(el, W, H, (f, s) => {
      ctx.font = f
      return ctx.measureText(s).width
    })
    ctx.font = font
    ctx.direction = el.lang === "ar" ? "rtl" : "ltr"
    ctx.textBaseline = "top"
    const lineH = size * 1.3
    const boxX = el.x * W
    const boxW = el.w * W
    const top = el.y * H
    const side = el.align === "center" ? "center" : (el.align === "start") === (el.lang === "ar") ? "right" : "left"
    ctx.textAlign = side
    const anchor = side === "center" ? boxX + boxW / 2 : side === "right" ? boxX + boxW : boxX
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))

    if (el.bg) {
      const padX = size * 0.7
      const padY = size * 0.35
      const w = widest + padX * 2
      const h = lineH * lines.length + padY * 2 - (lineH - size)
      const left = side === "center" ? anchor - w / 2 : side === "right" ? anchor - w : anchor
      ctx.fillStyle = el.bg
      roundRect(ctx, left, top, w, h, h / 2)
      ctx.fill()
      ctx.fillStyle = el.color
      const textX = side === "center" ? anchor : side === "right" ? anchor - padX : anchor + padX
      lines.forEach((l, i) => ctx.fillText(l, textX, top + padY + i * lineH))
      boxes.push({ id: el.id, x: left, y: top, w, h })
      continue
    }
    ctx.fillStyle = el.color
    lines.forEach((l, i) => ctx.fillText(l, anchor, top + i * lineH))
    const h = lineH * lines.length
    const left = side === "center" ? anchor - widest / 2 : side === "right" ? anchor - widest : anchor
    if (el.role === "was") {
      // Through the middle of the drawn glyphs; fonts place them differently in the line box.
      const m = ctx.measureText(lines[0])
      const mid = top + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2
      ctx.strokeStyle = el.color
      ctx.lineWidth = Math.max(2, size * 0.08)
      ctx.beginPath()
      ctx.moveTo(left, mid)
      ctx.lineTo(left + widest, mid)
      ctx.stroke()
    }
    boxes.push({ id: el.id, x: left, y: top, w: widest, h })
  }
  ctx.restore()
  return boxes
}

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&family=Poppins:wght@400;700;800&display=block"

/**
 * Loads the store's fonts before anything is drawn or exported; a canvas drawn
 * with a fallback font would export the wrong letters for good.
 */
export async function loadFonts() {
  if (!document.querySelector(`link[href="${FONT_CSS}"]`)) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = FONT_CSS
    document.head.appendChild(link)
    await new Promise((resolve) => {
      link.onload = resolve
      link.onerror = resolve
    })
  }
  const wanted = [400, 700, 800].flatMap((w) => [`${w} 48px "Tajawal"`, `${w} 48px "Poppins"`])
  await Promise.all(wanted.map((f) => document.fonts.load(f, "عربي Ab 123")))
  await document.fonts.ready
  const missing = wanted.filter((f) => !document.fonts.check(f, "عربي Ab"))
  if (missing.length) throw new Error(`الخطوط ما اتحملتش (${missing.join("، ")}). التصدير متوقف علشان النص ما يطلعش بخط غلط.`)
}

/**
 * Re-stacks the text column after the real text is measured, so a headline
 * that wraps to two lines pushes the rest down instead of overlapping it.
 * The badge sits on the photo and keeps its place.
 */
export function reflow(design: Design, measure: (font: string, s: string) => number): Design {
  const { width: W, height: H } = SIZES[design.size]
  const isColumn = (t: TextEl) => t.role !== "badge"
  let texts = design.texts
  if (!texts.some(isColumn)) return design
  const top = Math.min(...texts.filter(isColumn).map((t) => t.y)) * H
  const bottomLimit = H * 0.95
  for (let round = 0; round < 8; round++) {
    let y = top
    const placed = new Map<string, number>()
    for (const el of texts.filter(isColumn)) {
      const { px, lines } = layoutText(el, W, H, measure)
      placed.set(el.id, y / H)
      const height = el.bg ? px * 1.3 * lines.length + px * 0.4 : px * 1.3 * lines.length
      y += height + px * 0.45
    }
    texts = texts.map((t) => (placed.has(t.id) ? { ...t, y: placed.get(t.id)! } : t))
    if (y <= bottomLimit) break
    // Too tall for the canvas: shrink every line in the column and stack again.
    const factor = Math.max(0.75, (bottomLimit - top) / (y - top))
    texts = texts.map((t) => (isColumn(t) ? { ...t, size: t.size * factor } : t))
  }
  return { ...design, texts }
}

/**
 * Writes the store's price into the price texts (price, struck original,
 * discount badge). Prices are never typed by hand: the server refuses an
 * image whose price text differs from the product's price.
 */
export function applyPrice(design: Design, price: Price | null): Design {
  const off = price ? discountPercent(price) : 0
  const digits = (lang: Lang) => design.arabicDigits && lang === "ar"
  const texts = design.texts
    .filter((t) => (t.role === "price" ? !!price : t.role === "was" || t.role === "badge" ? off > 0 : true))
    .map((t) => {
      if (!price) return t
      if (t.role === "price") return { ...t, text: formatPrice(price.amount, t.lang, digits(t.lang)) }
      if (t.role === "was") return { ...t, text: formatPrice(price.original_amount, t.lang, digits(t.lang)) }
      if (t.role === "badge") return { ...t, text: t.lang === "ar" ? `خصم ${digits(t.lang) ? toArabicDigits(String(off)) : off}%` : `-${off}%` }
      return t
    })
  return { ...design, texts }
}
