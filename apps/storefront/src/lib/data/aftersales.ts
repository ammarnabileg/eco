"use server"

import { cookies as nextCookies } from "next/headers"

import { sdk } from "@lib/config"
import { getLocale, getT } from "@i18n/server"
import { getAuthHeaders } from "./cookies"

// Guest order tracking and after-sales requests. The tracking pass from the
// backend (30 minutes, one order) lives in an httpOnly cookie: page scripts
// never see it, and it is sent to the backend only from the server.

const TRACK_COOKIE = "_laly_track"
const TRACK_HEADER = "x-laly-track-token"

export type TimelineStep = {
  key: "placed" | "paid" | "preparing" | "shipped" | "delivered" | "canceled"
  done: boolean
  at: string | null
}

export type TrackedOrder = {
  id: string
  display_id: number
  status: string
  created_at: string
  currency_code: string
  payment_status: string | null
  fulfillment_status: string | null
  items: {
    id: string
    title: string
    variant_title: string | null
    thumbnail: string | null
    quantity: number
    unit_price: number
    total: number
  }[]
  subtotal: number
  shipping_total: number
  discount_total: number
  tax_total: number
  total: number
  timeline: TimelineStep[]
}

export type TrackStartResult =
  | { ok: true; status: "code_sent" | "verified" }
  | { ok: false; error: string; unavailable?: boolean }

const failure = async (e: Error & { status?: number }, fallback: string) => {
  const t = await getT()
  return e.status === 429 || /too many/i.test(e.message) ? t("aftersales.error_too_many") : t(fallback)
}

async function saveTrackToken(token: string, expiresAt: string) {
  const cookies = await nextCookies()
  cookies.set(TRACK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  })
}

async function trackToken() {
  try {
    return (await nextCookies()).get(TRACK_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

/**
 * Asks for a WhatsApp code for an order. The answer is the same whether or
 * not the number and phone match. A signed-in owner is verified at once.
 */
export async function startTracking(input: { display_id: string; phone?: string; website?: string }): Promise<TrackStartResult> {
  const t = await getT()
  const displayId = Number(String(input.display_id).replace(/\D/g, ""))
  if (!displayId) return { ok: false, error: t("aftersales.error_order_number") }
  const headers = await getAuthHeaders()
  try {
    const res = await sdk.client.fetch<
      { status: "code_sent" } | { status: "unavailable" } | { status: "verified"; token: string; expires_at: string }
    >("/store/track-order", {
      method: "POST",
      headers,
      body: { display_id: displayId, phone: input.phone?.trim() || undefined, website: input.website ?? "" },
    })
    if (res.status === "unavailable") return { ok: false, unavailable: true, error: t("aftersales.error_unavailable") }
    if (res.status === "verified") {
      await saveTrackToken(res.token, res.expires_at)
      return { ok: true, status: "verified" }
    }
    return { ok: true, status: "code_sent" }
  } catch (e) {
    return { ok: false, error: await failure(e as Error, "aftersales.error_generic") }
  }
}

export async function verifyTracking(input: { display_id: string; phone: string; code: string }) {
  const displayId = Number(String(input.display_id).replace(/\D/g, ""))
  try {
    const res = await sdk.client.fetch<{ token: string; expires_at: string }>("/store/track-order/verify", {
      method: "POST",
      body: { display_id: displayId, phone: input.phone.trim(), code: input.code.replace(/\D/g, "") },
    })
    await saveTrackToken(res.token, res.expires_at)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: await failure(e as Error, "aftersales.error_code") }
  }
}

/** The order the tracking cookie grants, or null when there is none or it expired. */
export async function getTrackedOrder(): Promise<TrackedOrder | null> {
  const token = await trackToken()
  if (!token) return null
  return sdk.client
    .fetch<{ order: TrackedOrder }>("/store/track-order", {
      method: "GET",
      headers: { [TRACK_HEADER]: token },
      cache: "no-store",
    })
    .then((r) => r.order)
    .catch(() => null)
}

export async function stopTracking() {
  const cookies = await nextCookies()
  cookies.delete(TRACK_COOKIE)
}

export type AfterSalesInput = {
  order_id: string
  kind: string
  reason: string
  details?: string
  phone?: string
  items: { line_item_id: string; quantity: number }[]
  /** Honeypot; must stay empty. */
  website?: string
}

/** Records the request for staff. Nothing is refunded or returned automatically. */
export async function submitAfterSalesRequest(input: AfterSalesInput) {
  const [locale, auth, token] = await Promise.all([getLocale(), getAuthHeaders(), trackToken()])
  try {
    const res = await sdk.client.fetch<{ after_sales_request: { id: string; order_display_id: number } }>(
      "/store/after-sales-requests",
      {
        method: "POST",
        headers: { ...auth, ...(token ? { [TRACK_HEADER]: token } : {}) },
        body: {
          order_id: input.order_id,
          kind: input.kind,
          reason: input.reason,
          details: input.details?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          items: input.items,
          locale,
          website: input.website ?? "",
        },
      }
    )
    return { ok: true as const, display_id: res.after_sales_request.order_display_id }
  } catch (e) {
    const err = e as Error & { status?: number }
    const t = await getT()
    if (err.status === 404) return { ok: false as const, error: t("aftersales.error_expired") }
    return { ok: false as const, error: await failure(err, "aftersales.error_generic") }
  }
}

export type SupportRequests = {
  install_requests: { id: string; service: string; status: string; preferred_date: string | null; created_at: string }[]
  quote_requests: { id: string; product_id: string; product_title: string; quantity: number; status: string; created_at: string }[]
  after_sales_requests: {
    id: string
    kind: string
    order_id: string
    order_display_id: number
    items: { line_item_id: string; title: string; quantity: number }[]
    reason: string
    status: string
    created_at: string
  }[]
}

/** The signed-in customer's own requests, or null when signed out. */
export async function listSupportRequests(): Promise<SupportRequests | null> {
  const headers = await getAuthHeaders()
  if (!("authorization" in headers)) return null
  return sdk.client
    .fetch<SupportRequests>("/store/customers/me/support-requests", { method: "GET", headers, cache: "no-store" })
    .catch(() => null)
}
