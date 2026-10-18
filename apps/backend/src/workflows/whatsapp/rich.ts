import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { WHATSAPP_MODULE } from "../../modules/whatsapp"
import { Card, sendCarousel, sendText } from "../../modules/whatsapp/client"
import { cartReminderText, kwd, normalizePhone, productsText } from "../../modules/whatsapp/messages"
import WhatsAppModuleService from "../../modules/whatsapp/service"
import { sendRich, storefrontUrl, WhatsAppSettings, whatsappSettings } from "./index"

const wa = (c: MedusaContainer) => c.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)

// Images must be absolute for WhatsApp to fetch them.
const absolute = (url?: string | null) => {
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  const base = (process.env.MEDUSA_BACKEND_URL ?? "").replace(/\/$/, "")
  return base ? `${base}${url.startsWith("/") ? "" : "/"}${url}` : null
}

/** Cards when interactive is on and every card has an image; else a text list. */
async function sendCards(settings: WhatsAppSettings, phone: string, body: string, cards: (Card | null)[], fallback: string) {
  const ready = cards.filter((c): c is Card => !!c)
  if (settings.interactive && ready.length && ready.length === cards.length) {
    try {
      await sendCarousel(settings.cfg, phone, { body, cards: ready })
      return "carousel" as const
    } catch {
      // fall back to text
    }
  }
  await sendText(settings.cfg, phone, `${body}\n\n${fallback}`)
  return "text" as const
}

// --- products shared by staff ------------------------------------------------

type ProductRow = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
  status: string
  variants?: { prices?: { amount: number; currency_code: string }[] }[]
}

const lowestKwd = (p: ProductRow) => {
  const amounts = (p.variants ?? []).flatMap((v) => v.prices ?? []).filter((x) => x.currency_code === "kwd").map((x) => Number(x.amount))
  return amounts.length ? Math.min(...amounts) : null
}

/** Sends up to 10 published products to a customer as swipeable cards. */
export async function sendProducts(container: MedusaContainer, rawPhone: string, productIds: string[], note?: string) {
  const settings = await whatsappSettings(container)
  const phone = normalizePhone(rawPhone)
  if (!settings.active) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Save and enable WhatsApp first")
  if (!phone) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid phone number")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "status", "variants.prices.amount", "variants.prices.currency_code"],
    filters: { id: productIds.slice(0, 10) },
  })
  const products = (data as unknown as ProductRow[]).filter((p) => p.status === "published")
  if (!products.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No published products to send")
  const rows = products.map((p) => ({ title: p.title, price: lowestKwd(p), url: storefrontUrl(`/products/${p.handle}`), image: absolute(p.thumbnail) }))
  const body = note?.trim() || (rows.length > 1 ? "منتجات مختارة لك من Laly" : "منتج مختار لك من Laly")
  const cards = rows.map((r) =>
    r.image
      ? {
          body: r.title,
          footer: r.price != null ? kwd(r.price) : "Laly",
          imageUrl: r.image,
          buttons: [{ type: "url" as const, text: "🛒 اشتري الآن", url: r.url }],
        }
      : null
  )
  return { phone, kind: await sendCards(settings, phone, body, cards, productsText(rows)), count: rows.length }
}

// --- abandoned carts ---------------------------------------------------------

const MIN_AGE_MS = 2 * 3600 * 1000
const MAX_AGE_MS = 24 * 3600 * 1000
const PHONE_COOLDOWN_MS = 7 * 24 * 3600 * 1000

type CartRow = {
  id: string
  completed_at?: string | null
  shipping_address?: { phone?: string | null; first_name?: string | null } | null
  customer?: { first_name?: string | null } | null
  items?: { title: string; product_title?: string | null; quantity: number; thumbnail?: string | null; total?: number | null }[]
}

const saveWaCartReminderStep = createStep(
  "save-wa-cart-reminder",
  async (input: { cart_id: string; phone: string; status: "sent" | "failed"; error?: string | null }, { container }) => {
    const row = await wa(container).createWaCartReminders(input)
    return new StepResponse(row.id, row.id)
  },
  async (id, { container }) => {
    if (id) await wa(container).deleteWaCartReminders([id])
  }
)

export const saveCartReminderWorkflow = createWorkflow(
  "save-cart-reminder",
  (input: { cart_id: string; phone: string; status: "sent" | "failed"; error?: string | null }) =>
    new WorkflowResponse(saveWaCartReminderStep(input))
)

/** One reminder per abandoned cart (2–24h idle), at most one per phone a week. */
export async function remindAbandonedCarts(container: MedusaContainer, now = Date.now()) {
  const settings = await whatsappSettings(container)
  if (!settings.active || !settings.cartReminder) return 0
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "completed_at",
      "shipping_address.phone",
      "shipping_address.first_name",
      "customer.first_name",
      "items.title",
      "items.product_title",
      "items.quantity",
      "items.thumbnail",
      "items.total",
    ],
    filters: { updated_at: { $gte: new Date(now - MAX_AGE_MS), $lte: new Date(now - MIN_AGE_MS) } },
    pagination: { take: 200 },
  })
  const svc = wa(container)
  let sent = 0
  for (const cart of data as unknown as CartRow[]) {
    const phone = normalizePhone(cart.shipping_address?.phone)
    if (cart.completed_at || !phone || !cart.items?.length) continue
    if ((await svc.listWaCartReminders({ cart_id: cart.id }, { take: 1 })).length) continue
    const recent = await svc.listWaCartReminders({ phone, created_at: { $gte: new Date(now - PHONE_COOLDOWN_MS) } }, { take: 1 })
    if (recent.length) continue

    const link = storefrontUrl(`/cart/recover/${cart.id}`)
    const name = cart.shipping_address?.first_name ?? cart.customer?.first_name ?? null
    const items = cart.items.map((i) => ({ title: i.product_title || i.title, quantity: Number(i.quantity) }))
    const text = cartReminderText(name, items, link)
    try {
      const cards = cart.items.slice(0, 10).map((i) => {
        const image = absolute(i.thumbnail)
        return image
          ? {
              body: `${i.product_title || i.title} × ${i.quantity}`,
              footer: i.total != null ? kwd(Number(i.total)) : "Laly",
              imageUrl: image,
              buttons: [{ type: "url" as const, text: "✅ كمّل طلبك", url: link }],
            }
          : null
      })
      if (cards.length > 1) await sendCards(settings, phone, "سلتك لسه مستنياك في Laly 🛒", cards, text)
      else await sendRich(settings, phone, text, { title: "سلتك مستنياك", buttons: [{ type: "url", text: "✅ كمّل طلبك", url: link }] })
      await saveCartReminderWorkflow(container).run({ input: { cart_id: cart.id, phone, status: "sent" } })
      sent++
    } catch (error) {
      await saveCartReminderWorkflow(container).run({
        input: { cart_id: cart.id, phone, status: "failed", error: (error as Error).message.slice(0, 500) },
      })
    }
  }
  return sent
}
