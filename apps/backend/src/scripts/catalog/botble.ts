// Turns a Botble product export (products + variations, one CSV) into Laly
// product drafts. Pure functions only, so the rules are unit-tested and the
// exec script stays a thin loop.

export type CsvRow = Record<string, string>

/** RFC 4180 parser: quoted fields, doubled quotes and newlines inside quotes. */
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const src = text.replace(/^﻿/, "")
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        field += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") {
        i++
      }
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += c
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim()))
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])))
}

export type BotbleProduct = { row: CsvRow; variations: CsvRow[] }

/** Variation rows follow their parent product row in Botble exports. */
export function groupProducts(rows: CsvRow[]): BotbleProduct[] {
  const products: BotbleProduct[] = []
  for (const row of rows) {
    if (row["Import Type"] === "variation") {
      const parent = products[products.length - 1]
      if (parent && parent.row.Name === row.Name) {
        parent.variations.push(row)
      }
    } else {
      products.push({ row, variations: [] })
    }
  }
  return products
}

// First match wins. null means the product is not imported (robot vacuums
// were dropped from the range).
const CATEGORY_RULES: [string | null, RegExp][] = [
  [null, /robot vacuum/],
  ["security-software", /kaspersky|norton|quick heal|antivirus/],
  ["video-doorbells", /doorbell/],
  ["video-recorders", /video recorder|\bnvr\b/],
  ["ip-camera", /network camera|ds-2cd|ds-2de|\bvigi\b.*camera/],
  ["solar-battery-cameras", /^solar panel|solar|battery|wire-free|cable-free/],
  ["wifi-cameras", /camera/],
  ["smart-sensors", /sensor|hub with chime|iot hub|centralhub|smart button|temperature/],
  ["smart-plugs-switches", /socket|smart plug|power strip|light switch|dimmer/],
  ["smart-lighting", /bulb|spotlight|light strip/],
  ["switches", /\bswitch\b/],
  ["range-extenders", /extender|powerline/],
  ["mesh-wifi", /mesh|deco|halo/],
  ["mobile-routers", /\b4g\+?(?=\W|$)|\b5g\b|lte|mobile wi-?fi/],
  ["access-points", /access point|\beap\d|wireless bridge/],
  ["network-adapters", /adapter \(archer|usb adapter|pcie|pci express|network adapter|nano/],
  ["computer-accessories", /hub|type-c|usb/],
  ["wifi-routers", /router|archer|modem/],
]

const CAMERA_FORMS: [string, RegExp][] = [
  ["ptz-cameras", /ptz|speed dome|pan tilt|pan\/tilt/],
  ["panoramic-cameras", /panoramic|fisheye|dual-lens|180°/],
  ["cube-cameras", /\bcube\b/],
  ["turret-cameras", /turret/],
  ["bullet-cameras", /bullet/],
  ["dome-cameras", /dome/],
]

/**
 * The Laly category handle for a product, from its name and old Botble
 * categories. Returns null for products that are not carried any more and
 * "unmapped" when no rule applies, so the report can list them.
 */
export function classify(name: string, oldCategories: string): string | null {
  const hay = `${name} | ${oldCategories}`.toLowerCase()
  const match = CATEGORY_RULES.find(([, re]) => re.test(hay))
  if (!match) {
    return "unmapped"
  }
  if (match[0] !== "ip-camera") {
    return match[0]
  }
  const lower = name.toLowerCase()
  return CAMERA_FORMS.find(([, re]) => re.test(lower))?.[0] ?? "bullet-cameras"
}

/** The brand handle; product names win over the export's brand column, which has mistakes. */
export function brandOf(name: string, rawBrand: string): string | null {
  const n = name.toLowerCase()
  const b = rawBrand.toLowerCase()
  if (/\bvigi\b/.test(n)) return "vigi"
  if (/\btapo\b/.test(n) || b === "tapo") return "tapo"
  if (/\bkasa\b/.test(n) || b === "kasa") return "kasa"
  if (b.includes("mercusys")) return "mercusys"
  if (/\bds-[0-9a-z]/.test(n) || b === "hikvision") return "hikvision"
  if (b.includes("tp link") || b.includes("tp-link") || /\b(archer|deco|omada|jetstream)\b|\btl[ -]|\beap\d/.test(n)) {
    return "tp-link"
  }
  if (b.includes("tenda")) return "tenda"
  if (b.includes("kaspersky") || n.includes("kaspersky")) return "kaspersky"
  if (b.includes("norton") || n.includes("norton")) return "norton"
  if (b.includes("quick heal") || n.includes("quick heal")) return "quick-heal"
  return null
}

const PRETTY_PREFIXES: [RegExp, string][] = [
  [/^ARCHER\b/, "Archer"],
  [/^DECO\b/, "Deco"],
  [/^TAPO\b/, "Tapo"],
  [/^TL /, "TL-"],
]

/**
 * The manufacturer part number from the trailing parenthesis of a name:
 * "... Camera (DS-2CD2047G2-LU(2.8mm))" -> "DS-2CD2047G2-LU",
 * "... Router (ARCHER BE230)" -> "Archer BE230". Lens or packaging suffixes
 * in nested parentheses are dropped; they belong in the specs.
 */
export function mpnOf(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed.endsWith(")")) {
    return null
  }
  let depth = 0
  let start = -1
  for (let i = trimmed.length - 1; i >= 0; i--) {
    if (trimmed[i] === ")") depth++
    if (trimmed[i] === "(") depth--
    if (depth === 0) {
      start = i
      break
    }
  }
  if (start < 0) {
    return null
  }
  let inner = trimmed.slice(start + 1, -1).trim()
  inner = inner.split("(")[0].trim().replace(/[\s/-]+$/, "")
  // "(V1)", "(Availability based on regions)", "(3 Devices)" are not models.
  if (
    !inner ||
    /^v\d+$/i.test(inner) ||
    /[a-z]{4,} [a-z]{3,}/.test(inner) ||
    /\b(devices?|users?|pack|years?)\b/i.test(inner) ||
    !/\d/.test(inner)
  ) {
    return null
  }
  for (const [re, to] of PRETTY_PREFIXES) {
    inner = inner.replace(re, to)
  }
  return inner
}

const SERIES = /\b(Pro|Value|Ultra|Special|IOT|PT|eDVR) Series\b/i

/** Hikvision series from the old categories ("Pro Series" was used as a category). */
export function seriesOf(oldCategories: string): string | null {
  const m = oldCategories.match(SERIES)
  return m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} Series` : null
}

const OPTION_TITLES: Record<string, string> = {
  pack: "عدد القطع",
  "number of ports": "عدد المنافذ",
  "poe support / poe ports": "PoE",
  "wi-fi speed": "سرعة الواي فاي",
  "wi-fi frequency / band": "الترددات",
  "ethernet ports": "منافذ الإيثرنت",
  "special features": "المزايا",
  "number of users / devices": "عدد الأجهزة",
  "subscription duration": "مدة الاشتراك",
  "edition / tier": "الإصدار",
  "license type": "نوع الترخيص",
  "supported operating systems": "الأنظمة المدعومة",
}

/** "Vigi  S345" -> "VIGI S345"; "VIGI C440(2.8MM)" keeps its lens suffix as a SKU. */
export const cleanPartNo = (v: string | undefined | null) => {
  const t = (v ?? "").replace(/\s+/g, " ").trim()
  return t ? t.replace(/^vigi\b/i, "VIGI") : null
}

/** The model without lens or packaging suffixes, for MPN and de-duplication. */
export const baseModel = (v: string | null) => (v ? v.split("(")[0].trim() : null)

export const optionTitle = (name: string) => {
  const key = name.trim().toLowerCase()
  if (key.startsWith("part no") || key === "tapo" || key === "model") {
    return "الموديل"
  }
  return OPTION_TITLES[key] ?? name.trim()
}

/**
 * Splits "Name:Value,Name:Value" using the attribute names the parent row
 * declares, so values that contain commas ("Windows, macOS") survive.
 */
export function parseAttributes(value: string, names: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  const positions = names
    .map((n) => ({ n, i: value.indexOf(`${n}:`) }))
    .filter((p) => p.i >= 0)
    .sort((a, b) => a.i - b.i)
  positions.forEach((p, k) => {
    const end = k + 1 < positions.length ? positions[k + 1].i - 1 : value.length
    out[p.n] = value.slice(p.i + p.n.length + 1, end).replace(/,\s*$/, "").trim()
  })
  return out
}

export type VariantDraft = {
  title: string
  sku: string | null
  price: number | null
  options: Record<string, string>
  rank: number
}

export type ProductDraft = {
  botble_id: string
  handle: string
  title: string
  category: string | null
  brand: string | null
  mpn: string | null
  series: string | null
  price_on_request: boolean
  thumbnail: string | null
  images: string[]
  options: { title: string; values: string[] }[]
  variants: VariantDraft[]
  old_url: string | null
  labels: string[]
  collections: string[]
  old_categories: string
}

const money = (v: string) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : null
}

const list = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

/** How much a row carries, to keep the better of two rows for one product. */
export const richness = (p: BotbleProduct) =>
  p.variations.length * 10 +
  [p.row.Image, ...list(p.row.Images)].filter(Boolean).length +
  (/\(.+\)$/.test(p.row.Name.trim()) ? 5 : 0) +
  (Number(p.row.Price) > 0 ? 3 : 0)

export function toDraft(p: BotbleProduct): ProductDraft {
  const { row } = p
  const name = row.Name.replace(/\s+/g, " ").trim()
  const mpn = mpnOf(name)
  const images = [...new Set([row.Image, ...list(row.Images)].filter((u) => /^https:\/\//.test(u)))]

  let options: ProductDraft["options"] = []
  let variants: VariantDraft[]
  const attrNames = list(row["Product Attributes"])
  if (p.variations.length > 1) {
    const parsed = p.variations.map((v) => parseAttributes(v["Product Attributes"], attrNames))
    const allVarying = attrNames.filter((n) => new Set(parsed.map((a) => a[n] ?? "")).size > 1)
    // The part number becomes the SKU; it is only an option when nothing
    // else tells the variants apart.
    const withoutPart = allVarying.filter((n) => !n.toLowerCase().startsWith("part no"))
    const distinct = (names: string[]) =>
      new Set(parsed.map((a) => JSON.stringify(names.map((n) => a[n] ?? "")))).size === parsed.length
    const varying = withoutPart.length && distinct(withoutPart) ? withoutPart : allVarying
    const seen = new Set<string>()
    variants = []
    p.variations.forEach((v, i) => {
      const opts = Object.fromEntries(varying.map((n) => [optionTitle(n), parsed[i][n] || "-"]))
      const combo = JSON.stringify(opts)
      if (!varying.length || seen.has(combo)) {
        return
      }
      seen.add(combo)
      const partNo = cleanPartNo(Object.entries(parsed[i]).find(([k]) => k.toLowerCase().startsWith("part no"))?.[1])
      variants.push({
        title: Object.values(opts).join(" / "),
        sku: partNo || null,
        price: money(v.Price),
        options: opts,
        rank: v["Is Variation Default"] === "1" ? 0 : i + 1,
      })
    })
    options = varying.map((n) => ({
      title: optionTitle(n),
      values: [...new Set(variants.map((v) => v.options[optionTitle(n)]))],
    }))
  } else {
    variants = []
  }
  if (!variants.length) {
    const only = p.variations[0]
    const partNo = only
      ? cleanPartNo(
          Object.entries(parseAttributes(only["Product Attributes"], attrNames)).find(([k]) =>
            k.toLowerCase().startsWith("part no")
          )?.[1]
        )
      : null
    options = []
    variants = [
      {
        title: "Default",
        sku: partNo || mpn,
        price: money(only?.Price ?? row.Price) ?? money(row.Price),
        options: {},
        rank: 0,
      },
    ]
  }

  const model = mpn ?? baseModel(variants.length === 1 || new Set(variants.map((v) => baseModel(v.sku))).size === 1 ? variants[0].sku : null)
  // Botble lists different models under one title ("VIGI 4MP Outdoor
  // Full-Color Bullet Network Camera" x3); the model makes each one findable.
  const title = model && !name.toLowerCase().includes(model.toLowerCase()) ? `${name} (${model})` : name

  return {
    botble_id: row.ID,
    handle: row.Slug.toLowerCase(),
    title,
    category: classify(name, row.Categories),
    brand: brandOf(name, row.Brand),
    mpn: model,
    series: seriesOf(row.Categories),
    price_on_request: variants.every((v) => v.price === null),
    thumbnail: images[0] ?? null,
    images,
    options,
    variants,
    old_url: row.URL || null,
    labels: list(row.Labels),
    collections: list(row["Product Collections"]),
    old_categories: row.Categories,
  }
}
