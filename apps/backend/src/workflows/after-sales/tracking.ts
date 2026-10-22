import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { settingsKey } from "../../modules/integrations/store"
import { WHATSAPP_MODULE } from "../../modules/whatsapp"
import { hashOtp, newOtpCode, normalizePhone, otpMatches, otpText } from "../../modules/whatsapp/messages"
import WhatsAppModuleService from "../../modules/whatsapp/service"
import { sendRich, whatsappSettings } from "../whatsapp"
import { signTrackToken, trackSecret } from "./token"

// Guest order tracking. A visitor gives an order number and the phone used on
// it; a one-time code goes by WhatsApp to the phone stored on the order (never
// to a number the visitor picks). Whatever the input, the visitor gets the
// same answer, so the form never tells whether an order exists.
//
// Codes reuse the guest-checkout code table (`wa_otp`), keyed by
// `track:<order_id>` instead of a cart id: same hashing, expiry and attempts.

const wa = (c: MedusaContainer) => c.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)

export const TRACK_OTP_TTL_MS = 10 * 60 * 1000
const MAX_SENDS_PER_ORDER = 3 // per 10 minutes
const MAX_SENDS_PER_PHONE = 5 // per hour
export const TRACK_MAX_ATTEMPTS = 5

export const trackOtpKey = (orderId: string) => `track:${orderId}`

export type TrackableOrder = { id: string; display_id: number; customer_id: string | null; phones: string[] }

/** The order with this number, and every phone stored on it (normalised). */
export async function findTrackableOrder(container: MedusaContainer, displayId: number): Promise<TrackableOrder | null> {
  if (!Number.isSafeInteger(displayId) || displayId <= 0) return null
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "customer_id", "is_draft_order", "shipping_address.phone", "billing_address.phone", "customer.phone"],
    filters: { display_id: displayId as unknown as string },
  })
  const o = data.find((row) => !(row as { is_draft_order?: boolean }).is_draft_order) as
    | {
        id: string
        display_id: number
        customer_id?: string | null
        shipping_address?: { phone?: string | null } | null
        billing_address?: { phone?: string | null } | null
        customer?: { phone?: string | null } | null
      }
    | undefined
  if (!o) return null
  const phones = [o.shipping_address?.phone, o.billing_address?.phone, o.customer?.phone]
    .map((p) => normalizePhone(p))
    .filter((p): p is string => !!p)
  return { id: o.id, display_id: o.display_id, customer_id: o.customer_id ?? null, phones: [...new Set(phones)] }
}

/** Compares on digits after normalising (Kuwaiti 8-digit numbers get 965). */
export const phoneMatches = (order: TrackableOrder, phone: string | null | undefined) => {
  const p = normalizePhone(phone)
  return !!p && order.phones.includes(p)
}

const insertTrackOtpStep = createStep(
  "insert-track-otp",
  async (input: { order_id: string; phone: string; code: string }, { container }) => {
    const svc = wa(container)
    const key = trackOtpKey(input.order_id)
    const since = (ms: number) => ({ $gte: new Date(Date.now() - ms) })
    const [, byOrder] = await svc.listAndCountWaOtps({ cart_id: key, created_at: since(TRACK_OTP_TTL_MS) }, { take: 1 })
    const [, byPhone] = await svc.listAndCountWaOtps({ phone: input.phone, created_at: since(3600 * 1000) }, { take: 1 })
    // Over the limit: send nothing, and let the caller answer as usual.
    if (byOrder >= MAX_SENDS_PER_ORDER || byPhone >= MAX_SENDS_PER_PHONE) return new StepResponse(null, null)
    // A new code replaces older unused ones for this order.
    const open = await svc.listWaOtps({ cart_id: key, verified_at: null, expires_at: { $gt: new Date() } })
    if (open.length) await svc.updateWaOtps(open.map((o) => ({ id: o.id, expires_at: new Date() })))
    const row = await svc.createWaOtps({
      cart_id: key,
      phone: input.phone,
      code_hash: hashOtp(input.code, key, settingsKey()),
      expires_at: new Date(Date.now() + TRACK_OTP_TTL_MS),
    })
    return new StepResponse(row.id, row.id)
  },
  async (id, { container }) => {
    if (id) await wa(container).deleteWaOtps([id])
  }
)

export const createTrackOtpWorkflow = createWorkflow(
  "create-track-otp",
  (input: { order_id: string; phone: string; code: string }) => new WorkflowResponse(insertTrackOtpStep(input))
)

export type TrackRequestResult =
  | { status: "verified"; token: string; expires_at: string }
  | { status: "code_sent" }
  | { status: "unavailable" }

/**
 * Starts tracking an order. The signed-in owner gets a token straight away;
 * everyone else gets "code_sent" whether or not the number and phone match.
 */
export async function requestTracking(
  container: MedusaContainer,
  input: { display_id: number; phone?: string | null; customer_id?: string | null }
): Promise<TrackRequestResult> {
  const order = await findTrackableOrder(container, input.display_id)
  if (order && input.customer_id && order.customer_id === input.customer_id) {
    return { status: "verified", ...signTrackToken(order.id, trackSecret(container)) }
  }
  const settings = await whatsappSettings(container)
  if (!settings.active) return { status: "unavailable" }
  if (!order || !phoneMatches(order, input.phone)) return { status: "code_sent" }

  const phone = normalizePhone(input.phone)!
  const code = newOtpCode()
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  // Sent in the background so a matching order does not answer slower than a
  // wrong one. A gateway failure is logged; the visitor can ask again.
  void (async () => {
    const { result } = await createTrackOtpWorkflow(container).run({ input: { order_id: order.id, phone, code } })
    if (!result) return
    await sendRich(container, settings, phone, "otp", otpText(code), {
      title: "رمز التحقق",
      buttons: [{ type: "copy", text: "📋 نسخ الرمز", code }],
    })
  })().catch((error) => logger.warn(`Track-order code for order ${order.id} failed: ${(error as Error).message}`))
  return { status: "code_sent" }
}

const INVALID_CODE = "The code is wrong or expired. Request a new one."

const checkTrackOtpStep = createStep(
  "check-track-otp",
  async (input: { display_id: number; phone: string; code: string }, { container }) => {
    const order = await findTrackableOrder(container, input.display_id)
    const phone = normalizePhone(input.phone)
    if (!order || !phone || !order.phones.includes(phone)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, INVALID_CODE)
    }
    const svc = wa(container)
    const key = trackOtpKey(order.id)
    const [otp] = await svc.listWaOtps(
      { cart_id: key, phone, verified_at: null, expires_at: { $gt: new Date() } },
      { take: 1, order: { created_at: "DESC" } }
    )
    if (!otp || otp.attempts >= TRACK_MAX_ATTEMPTS) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, INVALID_CODE)
    }
    if (!otpMatches(input.code, key, settingsKey(), otp.code_hash)) {
      await svc.updateWaOtps({ id: otp.id, attempts: otp.attempts + 1 })
      throw new MedusaError(MedusaError.Types.INVALID_DATA, INVALID_CODE)
    }
    // Single use: a verified code no longer matches the lookup above.
    await svc.updateWaOtps({ id: otp.id, verified_at: new Date() })
    return new StepResponse(order.id, otp.id)
  },
  async (id, { container }) => {
    if (id) await wa(container).updateWaOtps({ id, verified_at: null })
  }
)

export const verifyTrackOtpWorkflow = createWorkflow(
  "verify-track-otp",
  (input: { display_id: number; phone: string; code: string }) => new WorkflowResponse(checkTrackOtpStep(input))
)

export async function verifyTracking(container: MedusaContainer, input: { display_id: number; phone: string; code: string }) {
  // A failed attempt must still be counted, so the step's write is not rolled back by the error.
  const { result, errors } = await verifyTrackOtpWorkflow(container).run({ input, throwOnError: false })
  if (errors?.length || !result) throw new MedusaError(MedusaError.Types.INVALID_DATA, INVALID_CODE)
  return signTrackToken(result, trackSecret(container))
}

// --- the order view ------------------------------------------------------------

export type TimelineStep = { key: "placed" | "paid" | "preparing" | "shipped" | "delivered" | "canceled"; done: boolean; at: string | null }

type DetailOrder = {
  id: string
  display_id: number
  status: string
  created_at: string | Date
  canceled_at?: string | Date | null
  currency_code: string
  customer_id?: string | null
  payment_status?: string
  fulfillment_status?: string
  total: number
  subtotal: number
  item_total?: number
  shipping_total: number
  discount_total: number
  tax_total: number
  items?: {
    id: string
    title: string
    product_title?: string | null
    variant_title?: string | null
    thumbnail?: string | null
    quantity: number
    unit_price: number
    total: number
  }[]
  fulfillments?: {
    created_at?: string | Date | null
    packed_at?: string | Date | null
    shipped_at?: string | Date | null
    delivered_at?: string | Date | null
    canceled_at?: string | Date | null
  }[]
  payment_collections?: { payments?: { captured_at?: string | Date | null; created_at?: string | Date | null; canceled_at?: string | Date | null }[] }[]
}

const iso = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString() : null)
const earliest = (dates: (string | Date | null | undefined)[]) =>
  dates
    .map(iso)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null

const PAID = ["authorized", "partially_authorized", "captured", "partially_captured", "partially_refunded", "refunded"]

/** Status steps from Medusa's order, payment and fulfillment states. */
export function orderTimeline(o: DetailOrder): TimelineStep[] {
  const live = (o.fulfillments ?? []).filter((f) => !f.canceled_at)
  const payments = (o.payment_collections ?? []).flatMap((pc) => pc.payments ?? []).filter((p) => !p.canceled_at)
  const fs = o.fulfillment_status ?? ""
  const paid = PAID.includes(o.payment_status ?? "")
  const preparing = live.length > 0 || fs !== "not_fulfilled"
  const shippedAt = earliest(live.map((f) => f.shipped_at))
  const deliveredAt = earliest(live.map((f) => f.delivered_at))
  const shipped = !!shippedAt || ["shipped", "partially_shipped", "delivered", "partially_delivered"].includes(fs)
  const delivered = !!deliveredAt || fs === "delivered"
  const steps: TimelineStep[] = [
    { key: "placed", done: true, at: iso(o.created_at) },
    { key: "paid", done: paid, at: paid ? earliest(payments.map((p) => p.captured_at ?? p.created_at)) : null },
    { key: "preparing", done: preparing, at: earliest(live.map((f) => f.packed_at ?? f.created_at)) },
    { key: "shipped", done: shipped, at: shippedAt },
    { key: "delivered", done: delivered, at: deliveredAt },
  ]
  if (o.status === "canceled") steps.push({ key: "canceled", done: true, at: iso(o.canceled_at) })
  return steps
}

const DETAIL_FIELDS = [
  "id",
  "display_id",
  "status",
  "created_at",
  "canceled_at",
  "currency_code",
  "customer_id",
  "total",
  "subtotal",
  "item_total",
  "shipping_total",
  "discount_total",
  "tax_total",
  "payment_status",
  "fulfillment_status",
  "items.*",
  "items.detail.*",
  "fulfillments.*",
  "payment_collections.*",
  "payment_collections.payments.*",
]

/** What a tracking visitor sees: no addresses, emails or payment details. */
export async function trackedOrder(container: MedusaContainer, orderId: string) {
  const { result } = await getOrderDetailWorkflow(container).run({
    input: { order_id: orderId, fields: DETAIL_FIELDS, filters: { is_draft_order: false } },
  })
  const o = result as unknown as DetailOrder
  return {
    id: o.id,
    display_id: o.display_id,
    status: o.status,
    created_at: iso(o.created_at),
    currency_code: o.currency_code,
    customer_id: o.customer_id ?? null,
    payment_status: o.payment_status ?? null,
    fulfillment_status: o.fulfillment_status ?? null,
    items: (o.items ?? []).map((i) => ({
      id: i.id,
      title: i.product_title || i.title,
      variant_title: i.variant_title ?? null,
      thumbnail: i.thumbnail ?? null,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      total: Number(i.total),
    })),
    subtotal: Number(o.item_total ?? o.subtotal),
    shipping_total: Number(o.shipping_total),
    discount_total: Number(o.discount_total),
    tax_total: Number(o.tax_total),
    total: Number(o.total),
    timeline: orderTimeline(o),
  }
}

export type TrackedOrder = Awaited<ReturnType<typeof trackedOrder>>
