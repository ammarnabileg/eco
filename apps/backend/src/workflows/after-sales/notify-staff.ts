import { MedusaContainer } from "@medusajs/framework/types"

import { AFTER_SALES_MODULE } from "../../modules/after-sales"
import AfterSalesModuleService from "../../modules/after-sales/service"
import { CATALOG_MODULE } from "../../modules/catalog"
import CatalogModuleService from "../../modules/catalog/service"
import { STORE_CONTENT_MODULE } from "../../modules/store-content"
import StoreContentModuleService from "../../modules/store-content/service"
import { sendText } from "../../modules/whatsapp/client"
import { normalizePhone } from "../../modules/whatsapp/messages"
import { whatsappSettings } from "../whatsapp"

// A short WhatsApp note to the store's own number (the "whatsapp" contact in
// the admin's site settings) when a customer sends a request. Only the name,
// phone and a summary go out; staff open the admin link for the rest.

export type StaffRequestKind = "install" | "quote" | "after_sales"

const adminUrl = (path: string) =>
  `${(process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "")}/app${path}`

const SERVICE_AR: Record<string, string> = {
  cctv: "كاميرات مراقبة",
  networking: "شبكات وواي فاي",
  smart_home: "منزل ذكي",
  intercom: "انتركم",
  other: "أخرى",
}
const KIND_AR: Record<string, string> = { return: "إرجاع", exchange: "استبدال", warranty: "ضمان" }
const REASON_AR: Record<string, string> = {
  defective: "عيب في المنتج",
  wrong_item: "منتج خاطئ",
  not_as_described: "غير مطابق للوصف",
  changed_mind: "غيّر رأيه",
  other: "سبب آخر",
}

const clip = (s: string | null | undefined, n = 200) => {
  const t = String(s ?? "").trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

/** The message text, or null when the request no longer exists. */
export async function staffRequestText(container: MedusaContainer, kind: StaffRequestKind, id: string) {
  if (kind === "install") {
    const [r] = await container.resolve<CatalogModuleService>(CATALOG_MODULE).listInstallRequests({ id }, { take: 1 })
    if (!r) return null
    return [
      "🔧 طلب تركيب جديد",
      `الخدمة: ${SERVICE_AR[r.service] ?? r.service}`,
      `العميل: ${r.customer_name}`,
      `الهاتف: ${r.phone}`,
      `المنطقة: ${[r.governorate, r.area].filter(Boolean).join(" - ")}`,
      r.preferred_date ? `الموعد المفضّل: ${r.preferred_date}` : null,
      `التفاصيل: ${adminUrl("/catalog")} (تبويب طلبات التركيب)`,
    ]
  }
  if (kind === "quote") {
    const [r] = await container.resolve<CatalogModuleService>(CATALOG_MODULE).listQuoteRequests({ id }, { take: 1 })
    if (!r) return null
    return [
      "💬 طلب عرض سعر جديد",
      `المنتج: ${clip(r.product_title, 120)} × ${r.quantity}`,
      `العميل: ${r.customer_name}`,
      `الهاتف: ${r.phone}`,
      `التفاصيل: ${adminUrl("/catalog")} (تبويب طلبات عرض السعر)`,
    ]
  }
  const [r] = await container.resolve<AfterSalesModuleService>(AFTER_SALES_MODULE).listAfterSalesRequests({ id }, { take: 1 })
  if (!r) return null
  const items = (r.items as unknown as { title: string; quantity: number }[]) ?? []
  return [
    `↩️ طلب ${KIND_AR[r.kind] ?? r.kind} جديد`,
    `الطلب: #${r.order_display_id}`,
    `السبب: ${REASON_AR[r.reason] ?? r.reason}`,
    ...items.slice(0, 5).map((i) => `• ${clip(i.title, 80)} × ${i.quantity}`),
    `الهاتف: ${r.phone}`,
    `التفاصيل: ${adminUrl("/after-sales")}`,
  ]
}

/** Sends the note; false when WhatsApp or the store number is not set up. Throws on gateway errors. */
export async function notifyStaff(container: MedusaContainer, kind: StaffRequestKind, id: string) {
  const settings = await whatsappSettings(container)
  if (!settings.active) return false
  const site = await container.resolve<StoreContentModuleService>(STORE_CONTENT_MODULE).getSettings()
  const to = normalizePhone((site as { whatsapp?: string | null } | null)?.whatsapp)
  if (!to) return false
  const lines = await staffRequestText(container, kind, id)
  if (!lines) return false
  // Straight to the gateway, not through the inbox: these are internal notes.
  await sendText(settings.cfg, to, lines.filter((l) => l !== null).join("\n"))
  return true
}
