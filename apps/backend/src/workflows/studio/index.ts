import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, QueryContext } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { AI_MODULE } from "../../modules/ai"
import AiModuleService from "../../modules/ai/service"
import { newRunId } from "../ai/usage"
import { aiGenerateImage, aiText, parseJsonObject } from "../ai-product/ai"
import { storeFile } from "../ai-product/create"
import { createHeroSlideWorkflow, updateHeroSlideWorkflow } from "../store-content/hero-slides"

// The image studio: backgrounds from the image model (no text in them), ad
// copy from the text model on request, prices read from the store, and the
// finished banner published as a homepage slide. Text is drawn in the admin's
// browser, so editing it never calls an image model.

type Query = { graph: (q: Record<string, unknown>) => Promise<{ data: unknown[] }> }
const queryOf = (c: MedusaContainer) => c.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query
const ai = (c: MedusaContainer) => c.resolve<AiModuleService>(AI_MODULE)

export const SIZES = {
  square: { width: 1080, height: 1080, aspect: "1:1" },
  post: { width: 1080, height: 1350, aspect: "3:4" },
  story: { width: 1080, height: 1920, aspect: "9:16" },
  banner: { width: 1920, height: 600, aspect: "16:9" },
} as const
export type SizeKey = keyof typeof SIZES

// --- prices --------------------------------------------------------------------

export type PriceSnapshot = {
  amount: number
  original_amount: number
  currency_code: string
  price_list_id: string | null
  ends_at: string | null
}

type PricedVariant = {
  calculated_price?: {
    calculated_amount?: number | null
    original_amount?: number | null
    calculated_price?: { price_list_id?: string | null } | null
  } | null
}

/** The lowest price a customer pays today (sale price lists applied), as the store computes it. */
export async function productPrice(container: MedusaContainer, productId: string, currency = "kwd"): Promise<PriceSnapshot | null> {
  const query = queryOf(container)
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "variants.calculated_price.calculated_amount",
      "variants.calculated_price.original_amount",
      "variants.calculated_price.calculated_price.price_list_id",
    ],
    filters: { id: productId },
    context: { variants: { calculated_price: QueryContext({ currency_code: currency }) } },
  })
  const variants = ((data[0] as { variants?: PricedVariant[] } | undefined)?.variants ?? []).filter(
    (v) => typeof v.calculated_price?.calculated_amount === "number"
  )
  if (!variants.length) return null
  const cheapest = variants.sort((a, b) => a.calculated_price!.calculated_amount! - b.calculated_price!.calculated_amount!)[0]
  const cp = cheapest.calculated_price!
  const priceListId = cp.calculated_price?.price_list_id ?? null
  let endsAt: string | null = null
  if (priceListId) {
    const { data: lists } = await query.graph({ entity: "price_list", fields: ["id", "ends_at"], filters: { id: priceListId } })
    const e = (lists[0] as { ends_at?: string | Date | null } | undefined)?.ends_at
    endsAt = e ? new Date(e).toISOString() : null
  }
  return {
    amount: Number(cp.calculated_amount),
    original_amount: Number(cp.original_amount ?? cp.calculated_amount),
    currency_code: currency,
    price_list_id: priceListId,
    ends_at: endsAt,
  }
}

export const samePrice = (a: PriceSnapshot, b: PriceSnapshot) =>
  Math.abs(a.amount - b.amount) < 0.0005 && Math.abs(a.original_amount - b.original_amount) < 0.0005

type ShownText = { role?: string; text?: string }
const numberIn = (text: string) => {
  const latin = text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٫/g, ".")
  const m = /\d+(?:\.\d+)?/.exec(latin)
  return m ? Number(m[0]) : null
}

/**
 * A price on the image must be the store's price: the "price" text shows the
 * snapshot's amount and the struck "was" text its original amount. A price
 * typed by hand, or kept from an older snapshot, is refused.
 */
export function checkShownPrices(elements: unknown, snapshot: PriceSnapshot | null) {
  const texts = ((elements as { texts?: ShownText[] } | null)?.texts ?? []).filter((t) => t.role === "price" || t.role === "was")
  for (const t of texts) {
    if (!snapshot) return "في سعر مكتوب على التصميم بس مش مربوط بمنتج. اختار المنتج علشان السعر ييجي من المتجر."
    const want = t.role === "price" ? snapshot.amount : snapshot.original_amount
    const shown = numberIn(t.text ?? "")
    if (shown === null || Math.abs(shown - want) >= 0.0005) {
      return `السعر المكتوب "${t.text}" مش مطابق لسعر المتجر (${want.toFixed(3)}).`
    }
  }
  return null
}

// --- backgrounds and copy ----------------------------------------------------------

const STYLES: Record<string, string> = {
  tech: "dark teal and deep navy gradient with soft glowing light streaks, modern tech feel",
  clean: "bright clean studio backdrop, soft white to light grey gradient, gentle shadows",
  warm: "warm sand and gold tones, soft bokeh lights, festive but elegant",
  home: "softly blurred modern Kuwaiti living room interior, warm daylight, shallow depth of field",
}

export function backgroundPrompt(input: { style: string; prompt?: string | null; size: SizeKey }) {
  const style = STYLES[input.style] ?? STYLES.tech
  const extra = input.prompt?.trim() ? ` ${input.prompt.trim()}.` : ""
  const room =
    input.size === "banner"
      ? "Keep the top and bottom fifth plain, it will be cropped."
      : "Leave large calm empty areas for a product photo and a headline."
  return `Advertising background for an electronics store: ${style}.${extra} ${room} Absolutely no text, letters, numbers, logos, watermarks, people or devices.`
}

export async function generateBackground(container: MedusaContainer, input: { size: SizeKey; style: string; prompt?: string | null }) {
  const size = SIZES[input.size]
  const image = await aiGenerateImage(container, backgroundPrompt(input), size.aspect)
  return storeFile(container, `banner-bg-${input.size}-${Date.now()}`, image)
}

export type AdCopy = { ar: { headline: string; subtitle: string; button: string }; en: { headline: string; subtitle: string; button: string } }

export async function adCopy(container: MedusaContainer, input: { product_id?: string | null; brief?: string | null }): Promise<AdCopy> {
  let product = ""
  if (input.product_id) {
    const { data } = await queryOf(container).graph({ entity: "product", fields: ["title", "subtitle"], filters: { id: input.product_id } })
    const p = data[0] as { title?: string; subtitle?: string | null } | undefined
    if (p) product = `${p.title}${p.subtitle ? ` — ${p.subtitle}` : ""}`
  }
  const text = await aiText(
    container,
    `You write short ad copy for Laly, an electronics store in Kuwait. Arabic: natural Modern Standard Arabic that reads well in Kuwait. No prices, no discounts, no percentages, no promises that are not in the brief, no emojis. Headline at most 6 words, subtitle at most 12 words, button at most 3 words. Answer with JSON only: {"ar":{"headline":"","subtitle":"","button":""},"en":{"headline":"","subtitle":"","button":""}}`,
    [product ? `PRODUCT: ${product}` : "", input.brief?.trim() ? `BRIEF: ${input.brief.trim()}` : "", product || input.brief ? "" : "General store promotion."]
      .filter(Boolean)
      .join("\n"),
    { task: "marketing_copy", runId: newRunId() }
  )
  const out = parseJsonObject(text) as Partial<AdCopy>
  const pick = (o: unknown, k: string, max: number) => String((o as Record<string, unknown> | undefined)?.[k] ?? "").trim().slice(0, max)
  return {
    ar: { headline: pick(out.ar, "headline", 80), subtitle: pick(out.ar, "subtitle", 160), button: pick(out.ar, "button", 30) },
    en: { headline: pick(out.en, "headline", 80), subtitle: pick(out.en, "subtitle", 160), button: pick(out.en, "button", 30) },
  }
}

// --- saved designs -----------------------------------------------------------------

export type BannerInput = {
  title: string
  product_id?: string | null
  background_url?: string | null
  product_image_url?: string | null
  canvas_width: number
  canvas_height: number
  elements: Record<string, unknown>
  language: "ar" | "en" | "both"
  status?: "draft" | "approved"
  output_url?: string | null
  price_snapshot?: PriceSnapshot | null
  slide_id?: string | null
}

const storeAiBannerStep = createStep(
  "store-ai-banner",
  async (input: BannerInput & { id?: string }, { container }) => {
    const svc = ai(container)
    if (input.id) {
      const before = await svc.retrieveAiBanner(input.id)
      const row = await svc.updateAiBanners({ ...input, id: input.id })
      return new StepResponse(row, { created: null as string | null, before: before as unknown as Record<string, unknown> | null })
    }
    const row = await svc.createAiBanners(input)
    return new StepResponse(row, { created: row.id as string | null, before: null as Record<string, unknown> | null })
  },
  async (undo, { container }) => {
    if (!undo) return
    const svc = ai(container)
    if (undo.created) await svc.deleteAiBanners([undo.created])
    if (undo.before) await svc.updateAiBanners(undo.before as never)
  }
)

export const saveAiBannerWorkflow = createWorkflow("save-ai-banner", (input: BannerInput & { id?: string }) =>
  new WorkflowResponse(storeAiBannerStep(input))
)

const removeAiBannerStep = createStep(
  "remove-ai-banner",
  async (id: string, { container }) => {
    await ai(container).softDeleteAiBanners([id])
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) await ai(container).restoreAiBanners([id])
  }
)

export const deleteAiBannerWorkflow = createWorkflow("delete-ai-banner", (input: { id: string }) =>
  new WorkflowResponse(removeAiBannerStep(input.id))
)

/** Approving keeps the exported PNG and the price it shows, checked against the store now. */
export async function approveBanner(container: MedusaContainer, id: string, outputUrl: string) {
  const banner = await ai(container).retrieveAiBanner(id)
  const shown = banner.price_snapshot as PriceSnapshot | null
  const wrong = checkShownPrices(banner.elements, shown)
  if (wrong) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, wrong)
  if (shown && banner.product_id) {
    const now = await productPrice(container, banner.product_id, shown.currency_code)
    if (!now || !samePrice(now, shown)) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "السعر في التصميم مش هو سعر المنتج دلوقتي. حدّث السعر في التصميم وصدّره تاني.")
    }
  }
  const { result } = await saveAiBannerWorkflow(container).run({
    input: {
      id,
      title: banner.title,
      canvas_width: banner.canvas_width,
      canvas_height: banner.canvas_height,
      elements: banner.elements as Record<string, unknown>,
      language: banner.language,
      status: "approved",
      output_url: outputUrl,
    },
  })
  return result
}

/**
 * Puts an approved wide banner on the homepage (and its phone version when
 * given). The price is checked again first; a slide showing a sale ends when
 * the sale does.
 */
export async function publishSlide(
  container: MedusaContainer,
  input: { banner_id: string; mobile_banner_id?: string | null; cta_url?: string | null }
) {
  const svc = ai(container)
  const banner = await svc.retrieveAiBanner(input.banner_id)
  const mobile = input.mobile_banner_id ? await svc.retrieveAiBanner(input.mobile_banner_id) : null
  for (const b of [banner, mobile].filter(Boolean) as (typeof banner)[]) {
    if (b.status !== "approved" || !b.output_url) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `اعتمد التصميم "${b.title}" وصدّره الأول.`)
    }
    const shown = b.price_snapshot as PriceSnapshot | null
    if (shown && b.product_id) {
      const now = await productPrice(container, b.product_id, shown.currency_code)
      if (!now || !samePrice(now, shown)) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `السعر في "${b.title}" اتغيّر من وقت الاعتماد. افتح التصميم، حدّث السعر، وصدّره تاني.`
        )
      }
    }
  }

  const texts = (banner.elements as { texts?: { role?: string; lang?: string; text?: string }[] }).texts ?? []
  const headline = (lang: string) => texts.find((t) => t.role === "headline" && t.lang === lang)?.text?.trim()
  let ctaUrl = input.cta_url?.trim() || null
  if (!ctaUrl && banner.product_id) {
    const { data } = await queryOf(container).graph({ entity: "product", fields: ["handle"], filters: { id: banner.product_id } })
    const handle = (data[0] as { handle?: string } | undefined)?.handle
    if (handle) ctaUrl = `/products/${handle}`
  }
  const endsAt = [banner, mobile]
    .map((b) => (b?.price_snapshot as PriceSnapshot | null)?.ends_at)
    .filter((e): e is string => !!e)
    .sort()[0]

  const slide = {
    title_ar: headline("ar") || headline("en") || banner.title,
    title_en: headline("en") || headline("ar") || banner.title,
    banner_url: banner.output_url,
    banner_mobile_url: mobile?.output_url ?? null,
    cta_url: ctaUrl,
    is_active: true,
    ends_at: endsAt ? new Date(endsAt) : null,
  }
  // The slide may have been deleted from the content page since; then make a new one.
  const existing = banner.slide_id
    ? await updateHeroSlideWorkflow(container)
        .run({ input: { id: banner.slide_id, ...slide } })
        .then((r) => r.result)
        .catch(() => null)
    : null
  const saved = existing ?? (await createHeroSlideWorkflow(container).run({ input: slide })).result
  if (saved.id !== banner.slide_id) {
    await saveAiBannerWorkflow(container).run({
      input: {
        id: banner.id,
        title: banner.title,
        canvas_width: banner.canvas_width,
        canvas_height: banner.canvas_height,
        elements: banner.elements as Record<string, unknown>,
        language: banner.language,
        slide_id: saved.id,
      },
    })
  }
  return saved
}

/**
 * Hourly safety net for published slides: when a product's price no longer
 * matches the one on its banner (an offer ended early, a price was edited),
 * the slide is switched off and the banner goes back to draft, so the
 * homepage never advertises a wrong price. Offers with an end date already
 * end the slide through its `ends_at`.
 */
export async function stopStaleSlides(container: MedusaContainer) {
  const svc = ai(container)
  const live = await svc.listAiBanners({ status: "approved", slide_id: { $ne: null } } as never, { take: 200 })
  const stopped: string[] = []
  for (const b of live) {
    const shown = b.price_snapshot as PriceSnapshot | null
    if (!shown || !b.product_id || !b.slide_id) continue
    const now = await productPrice(container, b.product_id, shown.currency_code)
    if (now && samePrice(now, shown)) continue
    // A slide deleted by hand is already off the homepage.
    await updateHeroSlideWorkflow(container)
      .run({ input: { id: b.slide_id, is_active: false } })
      .catch(() => null)
    await saveAiBannerWorkflow(container).run({
      input: {
        id: b.id,
        title: b.title,
        canvas_width: b.canvas_width,
        canvas_height: b.canvas_height,
        elements: b.elements as Record<string, unknown>,
        language: b.language,
        status: "draft",
      },
    })
    stopped.push(b.id)
  }
  return stopped
}
