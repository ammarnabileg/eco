import { timingSafeEqual } from "node:crypto"

import { Logger, ProviderWebhookPayload } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import {
  Checkout,
  CheckoutRequest,
  gatewayFetch,
  GatewayStatus,
  RedirectOptions,
  RedirectPaymentProvider,
  SessionData,
  sessionFromReference,
  StatusResult,
  WebhookResult,
} from "../payment-redirect/base"

// Deema BNPL (Kuwait), per docs.deema.me merchant API v1: hosted checkout,
// auto-captured once the customer pays, refunds via /order/{ref}/refund.

export const DEEMA_SANDBOX_URL = "https://sandbox-api.deema.me/api/merchant/v1"

export type DeemaOptions = RedirectOptions & {
  apiKey: string
  baseUrl?: string
  /** Header name and value set in Deema's merchant portal for webhooks. */
  webhookHeader?: string
  webhookSecret?: string
  /** Deema's minimum is 1 KWD; merchant limits come from Deema. */
  minAmount?: number
}

type Order = {
  status?: string
  amount?: number | string
  currency_code?: string
  order_reference?: string
  merchant_order_id?: string
}

export function deemaStatus(status: string | undefined): GatewayStatus {
  switch ((status ?? "").toLowerCase()) {
    case "captured":
    case "fully_captured":
    case "partially_captured":
      return "paid"
    case "authorized":
      return "authorized"
    case "fully_refunded":
    case "partially_refunded":
      return "refunded"
    case "payment_cancelled":
    case "expired":
      return "canceled"
    case "declined":
    case "declined_by_regulator":
    case "declined_by_deema":
      return "failed"
    default:
      return "pending"
  }
}

/**
 * Deema's "Return Invoice ID": one per refund on the order. Numbered from
 * the refunds already made, so a failed refund retried keeps its reference.
 */
export function deemaRefundReference(data: SessionData) {
  const done = (data as { refunds?: unknown[] }).refunds?.length ?? 0
  return `${data.session_id ?? "refund"}-R${done + 1}`.slice(0, 255)
}

class DeemaProviderService extends RedirectPaymentProvider<DeemaOptions> {
  static identifier = "deema"
  protected readonly currencies = ["kwd"]

  static validateOptions(options: Record<string, unknown>) {
    if (!options.apiKey) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Deema needs apiKey")
    }
  }

  constructor(container: { logger: Logger }, options: DeemaOptions) {
    super(container, options)
  }

  private get base() {
    return (this.options_.baseUrl || DEEMA_SANDBOX_URL).replace(/\/$/, "")
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown) {
    return gatewayFetch<T>("Deema", `${this.base}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${this.options_.apiKey}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  protected async createCheckout(input: CheckoutRequest): Promise<Checkout> {
    if (input.amount < (this.options_.minAmount ?? 1)) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This order is below Deema's minimum amount")
    }
    const { status, body } = await this.request<{
      message?: string
      data?: { order_reference?: string; redirect_link?: string; error_code?: number } | null
    }>("POST", "/purchase", {
      amount: input.amount,
      currency_code: input.currency.toUpperCase(),
      merchant_order_id: input.reference,
      merchant_urls: { success: input.success_url, failure: input.failure_url },
    })
    const ref = body?.data?.order_reference
    const link = body?.data?.redirect_link
    if (status >= 400 || !ref || !link) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Deema could not start the checkout: ${body?.message ?? status}`
      )
    }
    return { external_id: ref, redirect_url: link, raw: { ...(body.data ?? {}) } }
  }

  protected async fetchStatus(externalId: string): Promise<StatusResult> {
    const { status, body } = await this.request<{ data?: Order }>(
      "GET",
      `/purchase/${encodeURIComponent(externalId)}/retrieve_by_reference`
    )
    if (status >= 400 || !body?.data) {
      return { status: "pending", raw: { http_status: status } }
    }
    const amount = Number(body.data.amount)
    return {
      status: deemaStatus(body.data.status),
      amount: Number.isFinite(amount) ? amount : undefined,
      raw: { ...body.data },
    }
  }

  protected async refund(externalId: string, amount: number, _full: boolean, data: SessionData) {
    const { status, body } = await this.request<{ success?: boolean; message?: string; data?: Record<string, unknown> }>(
      "POST",
      `/order/${encodeURIComponent(externalId)}/refund`,
      { amount, currency: "KWD", comment: "Refund from Laly", merchant_reference: deemaRefundReference(data) }
    )
    if (status >= 400 || body?.success === false) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Deema refund failed: ${body?.message ?? status}`)
    }
    return { ...(body?.data ?? {}) }
  }

  protected async cancelCheckout(externalId: string) {
    await this.request("POST", `/purchase/${encodeURIComponent(externalId)}/cancel-order`)
  }

  protected async parseWebhook(payload: ProviderWebhookPayload["payload"]): Promise<WebhookResult | null> {
    // Deema signs nothing: it sends a fixed header configured in its portal.
    const name = (this.options_.webhookHeader ?? "x-deema-signature").toLowerCase()
    const expected = this.options_.webhookSecret ?? ""
    const raw = payload.headers[name]
    const got = Array.isArray(raw) ? String(raw[0]) : String(raw ?? "")
    const a = Buffer.from(expected)
    const b = Buffer.from(got)
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, `bad or missing ${name} header`)
    }
    const data = payload.data as { merchant_order_ref?: string; order_ref?: string; status?: string }
    if (!data.order_ref) {
      return null
    }
    // The body is unsigned, so the status and amount come from the API.
    const confirmed = await this.fetchStatus(data.order_ref)
    return {
      session_id: sessionFromReference(data.merchant_order_ref),
      status: confirmed.status,
      amount: confirmed.amount,
    }
  }
}

export default DeemaProviderService
