import { createHmac, timingSafeEqual } from "node:crypto"

import { MedusaError } from "@medusajs/framework/utils"

import { gatewayFetch } from "../payment-redirect/base"

// KlickPay API v3 (KNET, MPGS cards, Apple/Google/Samsung Pay), per the
// "KlickPay API v3 Documentation v0.6". Amounts are KWD major units with
// three decimals. Field names keep the API's own spelling ("transction").

export const KLICKPAY_STAGING_URL = "https://api.staging.klick-pay.com/v3"

export type KlickPayMethod = "knet" | "mpgs" | "apple-pay" | "google-pay" | "samsung-pay" | "general-link"

type Envelope<T> = {
  success?: boolean
  code?: string
  message?: string
  data?: T
  details?: Record<string, unknown>
}

export type PaymentLink = { payment_id: string; payment_url: string; amount?: string; payment_method?: string }
export type PaymentStatus = {
  event?: string
  payment_id?: string
  status?: string
  result?: string
  amount?: string
  currency?: string
  payment_method?: string
}

export class KlickPayClient {
  private token: { value: string; expires: number } | null = null

  constructor(
    private readonly baseUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  // The docs say the token field name may vary and may be nested under data.
  static readToken(body: Record<string, unknown>): { token: string | null; expiresIn: number | null } {
    const data = (body?.data ?? {}) as Record<string, unknown>
    const pick = (o: Record<string, unknown>) => o.access_token ?? o.bearer_token ?? o.token
    const token = pick(data) ?? pick(body ?? {})
    const expires = Number(data.expires_in ?? body?.expires_in)
    return { token: typeof token === "string" ? token : null, expiresIn: Number.isFinite(expires) && expires > 0 ? expires : null }
  }

  private async accessToken(force = false): Promise<string> {
    if (!force && this.token && this.token.expires > Date.now()) {
      return this.token.value
    }
    const { status, body } = await gatewayFetch<Record<string, unknown>>("KlickPay", `${this.baseUrl}/auth/token`, {
      method: "POST",
      headers: { "client-id": this.clientId, "client-secret": this.clientSecret, Accept: "application/json" },
    })
    const { token, expiresIn } = KlickPayClient.readToken(body)
    if (status >= 400 || !token) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `KlickPay authentication failed (${status})`)
    }
    // Expiry is not documented: trust expires_in when sent, else refresh hourly.
    // A 401 also forces a new token (see call()).
    this.token = { value: token, expires: Date.now() + Math.max(60, (expiresIn ?? 3600) - 60) * 1000 }
    return token
  }

  private async call<T>(path: string, payload: unknown): Promise<Envelope<T>> {
    for (const retry of [false, true]) {
      const token = await this.accessToken(retry)
      const { status, body } = await gatewayFetch<Envelope<T>>("KlickPay", `${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (status === 401 && !retry) {
        continue
      }
      return typeof body === "object" && body ? body : { success: false, message: String(body) }
    }
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "KlickPay rejected the access token")
  }

  async createPayment(
    method: KlickPayMethod,
    input: {
      reference: string
      amount: number
      name: string
      email: string
      phone: string
      successUrl: string
      errorUrl: string
      items: { sku: string; name: string; quantity: number; unit_price: number }[]
    }
  ): Promise<PaymentLink> {
    const total = input.amount.toFixed(3)
    const res = await this.call<PaymentLink>(`/payments/${method}`, {
      client_name: input.name,
      client_email: input.email,
      client_phone: input.phone,
      transction_reference: input.reference.slice(0, 50),
      transction_amount: Number(total),
      success_page: input.successUrl,
      error_page: input.errorUrl,
      source: "web_app",
      transaction_details: input.items.length
        ? {
            total_items: input.items.reduce((n, i) => n + i.quantity, 0),
            total: Number(total),
            items: input.items.map((i) => ({
              item_code: i.sku,
              item_name: i.name,
              item_quantity: i.quantity,
              item_unit_price: i.unit_price,
              item_total_price: Math.round(i.unit_price * i.quantity * 1000) / 1000,
              item_currency: "KWD",
            })),
          }
        : undefined,
    })
    if (!res.success || !res.data?.payment_id || !res.data.payment_url) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `KlickPay could not create the payment link: ${res.code ?? ""} ${res.message ?? ""}`.trim()
      )
    }
    return res.data
  }

  async status(paymentId: string): Promise<Envelope<PaymentStatus>> {
    return this.call<PaymentStatus>("/payments/status", { payment_id: paymentId })
  }

  async refund(paymentId: string, amount: number | null): Promise<Envelope<Record<string, unknown>>> {
    return amount === null
      ? this.call("/refunds/full", { payment_id: paymentId })
      : this.call("/refunds/partial", { payment_id: paymentId, refund_amount: amount.toFixed(3) })
  }
}

/**
 * HMAC-SHA256 (hex) over the exact raw body, compared in constant time, and a
 * timestamp no older than `maxAgeSeconds`.
 */
export function verifyKlickPaySignature(
  rawBody: string | Buffer,
  headers: Record<string, unknown>,
  secret: string,
  maxAgeSeconds = 300,
  now = Date.now()
): boolean {
  const header = (name: string) => {
    const v = headers[name] ?? headers[name.toLowerCase()]
    return Array.isArray(v) ? String(v[0]) : typeof v === "string" ? v : ""
  }
  const signature = header("x-klickpay-signature")
  const timestamp = Number(header("x-klickpay-timestamp"))
  if (!secret || !signature || !Number.isFinite(timestamp)) {
    return false
  }
  if (Math.abs(now / 1000 - timestamp) > maxAgeSeconds) {
    return false
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature.trim().toLowerCase())
  return a.length === b.length && timingSafeEqual(a, b)
}

/** "paid"/"CAPTURED" style results to the shared gateway status. */
export function klickPayStatus(s: PaymentStatus | undefined): "paid" | "pending" | "failed" | "canceled" | "refunded" {
  const status = (s?.status ?? "").toLowerCase()
  const result = (s?.result ?? "").toUpperCase()
  const event = (s?.event ?? "").toLowerCase()
  if (status === "fully_refunded" || status === "partially_refunded") return "refunded"
  if (status === "paid" || result === "CAPTURED" || event === "payment.success") return "paid"
  if (event === "payment.voided" || status === "voided" || status === "canceled" || status === "cancelled") return "canceled"
  if (
    event === "payment.declined" ||
    event === "payment.failed" ||
    ["failed", "declined", "error", "expired"].includes(status) ||
    ["NOT CAPTURED", "DECLINED", "FAILED", "CANCELED"].includes(result)
  ) {
    return "failed"
  }
  return "pending"
}
