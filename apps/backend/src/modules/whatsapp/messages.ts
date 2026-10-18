import { createHmac, randomInt, timingSafeEqual } from "node:crypto"

// WhatsApp texts and the small rules around them. Pure, unit-tested.

/**
 * International number without "+" as Evolution expects (96550000000).
 * Kuwaiti 8-digit numbers get 965; anything too short is rejected.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  let d = String(input ?? "").replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\D/g, "")
  if (d.startsWith("00")) d = d.slice(2)
  if (d.length === 8) d = `965${d}`
  return d.length >= 10 && d.length <= 15 ? d : null
}

export const maskPhone = (phone: string) => `+${phone.slice(0, 3)} •••• ${phone.slice(-4)}`

export type Reply = "confirm" | "cancel" | null

/** Ids of the order message buttons; a tap arrives as this text. */
export const REPLY_CONFIRM = "laly_confirm"
export const REPLY_CANCEL = "laly_cancel"

/** "1", "١", "نعم", "تأكيد" confirm; "2", "٢", "إلغاء" cancel. */
export function parseReply(text: string | null | undefined): Reply {
  const t = String(text ?? "").trim().toLowerCase().replace(/[.!،,]/g, "")
  if (["1", "١", "نعم", "ايوه", "أيوه", "اكيد", "أكيد", "تأكيد", "تاكيد", "اكد", "أكد", "yes", "confirm", "ok", REPLY_CONFIRM].includes(t)) return "confirm"
  if (["2", "٢", "لا", "إلغاء", "الغاء", "الغي", "ألغي", "cancel", "no", REPLY_CANCEL].includes(t)) return "cancel"
  return null
}

export const newOtpCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0")

export const hashOtp = (code: string, cartId: string, key: string) =>
  createHmac("sha256", key).update(`${cartId}:${code}`).digest("hex")

export function otpMatches(code: string, cartId: string, key: string, hash: string) {
  const a = Buffer.from(hashOtp(code.trim(), cartId, key))
  const b = Buffer.from(hash)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const kwd = (n: number) => `${Number(n).toFixed(3)} د.ك`

export const welcomeText = (name: string | null) =>
  `أهلاً${name ? ` ${name}` : ""} في Laly 👋\nتم إنشاء حسابك بنجاح. هنا هتوصلك تحديثات طلباتك، وتقدر تكلمنا في أي وقت على نفس الرقم.`

export type OrderSummary = {
  display_id: number | string
  items: { title: string; quantity: number; total: number }[]
  shipping_total: number
  total: number
  address?: string | null
  payment?: string | null
}

export function orderText(o: OrderSummary) {
  const lines = o.items.map((i) => `• ${i.title} × ${i.quantity} — ${kwd(i.total)}`)
  return [
    `شكراً لطلبك من Laly 🛍️`,
    `رقم الطلب: #${o.display_id}`,
    ``,
    ...lines,
    o.shipping_total > 0 ? `التوصيل: ${kwd(o.shipping_total)}` : null,
    `الإجمالي: *${kwd(o.total)}*`,
    o.payment ? `الدفع: ${o.payment}` : null,
    o.address ? `العنوان: ${o.address}` : null,
    ``,
    `للتأكيد رد بـ *1*، ولإلغاء الطلب رد بـ *2*.`,
  ]
    .filter((l) => l !== null)
    .join("\n")
}

export const otpText = (code: string) =>
  `رمز التحقق لطلبك من Laly: *${code}*\nصالح لمدة 10 دقائق. لا تشاركه مع أي شخص.`

export const confirmedText = (displayId: number | string) =>
  `تم تأكيد طلبك #${displayId} ✅ سنبلغك عند الشحن.`

export const cancelRequestedText = (displayId: number | string) =>
  `وصلنا طلب إلغاء الطلب #${displayId}. سيتواصل معك فريقنا قريباً لتأكيد الإلغاء.`

export const cartReminderText = (name: string | null, items: { title: string; quantity: number }[], link: string) =>
  [
    `أهلاً${name ? ` ${name}` : ""} 👋`,
    `لسه محتفظين لك بسلتك في Laly:`,
    ...items.slice(0, 5).map((i) => `• ${i.title} × ${i.quantity}`),
    items.length > 5 ? `• و${items.length - 5} منتجات أخرى` : null,
    ``,
    `كمّل طلبك من هنا: ${link}`,
  ]
    .filter((l) => l !== null)
    .join("\n")

export const productsText = (products: { title: string; price: number | null; url: string }[]) =>
  products.map((p) => `• ${p.title}${p.price != null ? ` — ${kwd(p.price)}` : ""}\n${p.url}`).join("\n\n")
