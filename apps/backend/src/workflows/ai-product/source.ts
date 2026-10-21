import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

import { MedusaError } from "@medusajs/framework/utils"

// Reading a manufacturer's product page: its text (for the facts) and its
// images. Only public https addresses are fetched.

const PAGE_LIMIT = 3_000_000
const TEXT_LIMIT = 12_000
const IMAGE_LIMIT = 15_000_000

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

const IMAGE_EXT = /\.(jpe?g|png|webp)(\?|#|$)/i
const NOT_PRODUCT = /(logo|icon|sprite|favicon|avatar|badge|flag|banner-ad|placeholder|loading|spinner|pixel|tracking|1x1)/i

const stripTags = (h: string) => decode(h.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()

// Page parts that never describe the product.
const NOISE =
  /<(script|style|noscript|svg|iframe|nav|header|footer|aside|form|template)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi
const NOISE_BLOCK =
  /<(div|section|ul|ol)\b[^>]*(?:class|id)=["'][^"']*\b(?:nav|menu|footer|header|breadcrumb|related|recommend|cookie|newsletter|social|share|sidebar|banner|promo)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi

/** schema.org Product data in JSON-LD, as short "key: value" lines. */
function jsonLdFacts(html: string) {
  const lines: string[] = []
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown
    try {
      data = JSON.parse(m[1].trim())
    } catch {
      continue
    }
    const nodes = (Array.isArray(data) ? data : [data]).flatMap((d) => {
      const g = (d as { "@graph"?: unknown[] })?.["@graph"]
      return Array.isArray(g) ? g : [d]
    }) as Record<string, any>[]
    for (const n of nodes) {
      const type = [n?.["@type"]].flat().join(",")
      if (!/Product/i.test(type)) continue
      for (const key of ["name", "model", "mpn", "sku", "gtin13", "description", "color"]) {
        if (typeof n[key] === "string" && n[key].trim()) lines.push(`${key}: ${stripTags(n[key])}`)
      }
      const brand = typeof n.brand === "string" ? n.brand : n.brand?.name
      if (brand) lines.push(`brand: ${brand}`)
      for (const p of [n.additionalProperty].flat().filter(Boolean)) {
        if (p?.name && p?.value != null) lines.push(`${p.name}: ${p.value}${p.unitText ? ` ${p.unitText}` : ""}`)
      }
    }
  }
  return lines
}

/** Specification tables and definition lists as "key: value" lines. */
function specFacts(html: string) {
  const lines: string[] = []
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => stripTags(c[1])).filter(Boolean)
    if (cells.length >= 2) lines.push(`${cells[0]}: ${cells.slice(1).join(" | ")}`)
  }
  for (const dl of html.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)) {
    const k = stripTags(dl[1])
    const v = stripTags(dl[2])
    if (k && v) lines.push(`${k}: ${v}`)
  }
  return lines
}

/**
 * What a model needs from a product page, most useful first: structured data
 * (JSON-LD), specification tables, then the readable main text without menus,
 * footers, related products or scripts. Repeated lines are kept once.
 */
export function focusedText(html: string) {
  const main = html.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i)?.[2] ?? html
  const body = main.replace(NOISE, " ").replace(NOISE_BLOCK, " ")
  const prose = decode(
    body
      .replace(/<table\b[\s\S]*?<\/table>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/dd|\/dt)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    // Lone menu words and very short fragments say nothing about the product.
    .filter((l) => l.length > 2)
  const seen = new Set<string>()
  const sections: [string, string[]][] = [
    ["STRUCTURED DATA", jsonLdFacts(html)],
    ["SPECIFICATIONS", specFacts(body)],
    ["PAGE TEXT", prose],
  ]
  let out = ""
  for (const [title, lines] of sections) {
    const kept = lines.filter((l) => !seen.has(l) && (seen.add(l), true))
    if (!kept.length) continue
    const block = `## ${title}\n${kept.join("\n")}\n\n`
    if (out.length + block.length > TEXT_LIMIT) {
      out += block.slice(0, Math.max(0, TEXT_LIMIT - out.length))
      break
    }
    out += block
  }
  return out.trim()
}

/** Title, readable text and likely product images of an HTML page. */
export function extractPage(html: string, pageUrl: string) {
  const abs = (u: string) => {
    try {
      const url = new URL(decode(u.trim()), pageUrl)
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
    } catch {
      return null
    }
  }
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim()

  const text = focusedText(html)

  const candidates: string[] = []
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]*>/gi)) {
    const c = m[0].match(/content=["']([^"']+)["']/i)?.[1]
    if (c) candidates.push(c)
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    for (const attr of ["data-zoom-image", "data-large", "data-src", "data-original", "src"]) {
      const v = m[0].match(new RegExp(`\\s${attr}=["']([^"']+)["']`, "i"))?.[1]
      if (v && !v.startsWith("data:")) {
        candidates.push(v)
        break
      }
    }
    const srcset = m[0].match(/\ssrcset=["']([^"']+)["']/i)?.[1]
    if (srcset) {
      // The largest candidate of a srcset.
      const last = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).at(-1)
      if (last) candidates.push(last)
    }
  }
  const images = [
    ...new Set(
      candidates
        .map(abs)
        .filter((u): u is string => !!u && IMAGE_EXT.test(u) && !NOT_PRODUCT.test(u))
    ),
  ].slice(0, 40)

  return { title, text, images }
}

const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./]

/** Refuses non-https URLs and hosts that resolve to private networks. */
export async function assertPublicUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid URL")
  }
  if (url.protocol !== "https:") throw new MedusaError(MedusaError.Types.INVALID_DATA, "Only https links are allowed")
  const host = url.hostname.replace(/^\[|\]$/g, "")
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address)
  if (!addresses.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Cannot resolve ${host}`)
  for (const a of addresses) {
    const v4 = a.startsWith("::ffff:") ? a.slice(7) : a
    if (PRIVATE_V4.some((r) => r.test(v4)) || v4 === "::1" || /^f[cd]|^fe80/i.test(v4)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "This address is not allowed")
    }
  }
  return url
}

async function readLimited(res: Response, limit: number) {
  const reader = res.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks: Buffer[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "The file is too large")
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; LalyBot/1.0; +https://www.lalykw.com)",
  Accept: "text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8",
  "Accept-Language": "en,ar;q=0.8",
}

/** Downloads a public page (following redirects only to public hosts). */
export async function fetchPage(raw: string) {
  let url = await assertPublicUrl(raw)
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: "manual", signal: AbortSignal.timeout(20_000) }).catch(
      (e: Error) => {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Could not open the page: ${e.message}`)
      }
    )
    const location = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && location) {
      url = await assertPublicUrl(new URL(location, url).href)
      continue
    }
    if (!res.ok) throw new MedusaError(MedusaError.Types.INVALID_DATA, `The page answered HTTP ${res.status}`)
    const html = (await readLimited(res, PAGE_LIMIT)).toString("utf8")
    return { url: url.href, ...extractPage(html, url.href) }
  }
  throw new MedusaError(MedusaError.Types.INVALID_DATA, "Too many redirects")
}

/** Downloads one public image; returns its bytes and type. */
export async function fetchImage(raw: string) {
  const url = await assertPublicUrl(raw)
  const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow", signal: AbortSignal.timeout(30_000) })
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim()
  if (!res.ok || !/^image\/(jpeg|png|webp)$/.test(type)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Not an image (${res.status} ${type || "unknown type"})`)
  }
  return { bytes: await readLimited(res, IMAGE_LIMIT), type }
}
