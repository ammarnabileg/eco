import { ProviderWebhookPayload } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { IntegrationValues } from "../integrations/definitions"
import {
  Checkout,
  CheckoutRequest,
  gatewayFetch,
  GatewayStatus,
  ProviderContainer,
  RedirectOptions,
  RedirectPaymentProvider,
  SessionData,
  sessionFromReference,
  StatusResult,
  WebhookResult,
} from "../payment-redirect/base"

// Taly BNPL (Kuwait), per docs.taly.io: OAuth password login, initiate
// order, hosted checkout, status by merchantOrderId, cancel before
// confirmation, refunds. Orders are captured once the first instalment is
// paid (status CONFIRMED).

export const TALY_SANDBOX_URL = "https://api.dev-taly.io"
// Taly's documented fixed client credentials for the merchant API.
const TALY_CLIENT_AUTH = "Basic bWVyY2hhbnQtYXBpOnNlY3JldA=="

export type TalyOptions = RedirectOptions & {
  username?: string
  password?: string
  baseUrl?: string
  /** Public backend URL; Taly posts order updates to its webhook route. */
  backendUrl: string
  merchantLogo?: string
}

export function talyStatus(status: string | undefined): GatewayStatus {
  switch ((status ?? "").toUpperCase()) {
    case "CONFIRMED":
      return "paid"
    case "CANCELLED":
      return "canceled"
    case "REJECTED":
    case "FAILED":
      return "failed"
    default:
      return "pending"
  }
}

/** Taly wants the local number without the country code. */
export const talyPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  return digits.startsWith("965") && digits.length > 8 ? digits.slice(3) : digits
}

let token: { value: string; expires: number; key: string } | null = null

class TalyProviderService extends RedirectPaymentProvider<TalyOptions> {
  static identifier = "taly"
  protected readonly currencies = ["kwd"]
  protected readonly integration = "taly"

  static validateOptions(options: Record<string, unknown>) {
    if (!options.backendUrl) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Taly needs backendUrl")
    }
  }

  constructor(container: ProviderContainer, options: TalyOptions) {
    super(container, options)
  }

  protected fromSettings(values: IntegrationValues): Partial<TalyOptions> {
    return {
      username: values.username as string | undefined,
      password: values.password as string | undefined,
      baseUrl: values.base_url as string | undefined,
    }
  }

  private async base() {
    return ((await this.opts()).baseUrl || TALY_SANDBOX_URL).replace(/\/$/, "")
  }

  private async accessToken(force = false) {
    const { username, password } = await this.opts()
    if (!username || !password) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Taly is not configured")
    }
    const base = await this.base()
    const key = `${base}|${username}|${password}`
    if (!force && token && token.key === key && token.expires > Date.now()) {
      return token.value
    }
    const { status, body } = await gatewayFetch<Record<string, unknown>>("Taly", `${base}/uaa/oauth/token`, {
      method: "POST",
      headers: { Authorization: TALY_CLIENT_AUTH, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username,
        password,
        grant_type: "password",
        scope: "api",
      }).toString(),
    })
    // The token response is not documented; OAuth2 names it access_token.
    const value = typeof body?.access_token === "string" ? body.access_token : null
    if (status >= 400 || !value) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Taly login failed (${status})`)
    }
    const expiresIn = Number(body.expires_in)
    // Tokens last 24h per the docs; refresh an hour early.
    const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 24 * 3600
    token = { value, key, expires: Date.now() + Math.max(60, ttl - 3600) * 1000 }
    return value
  }

  private async request<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown) {
    for (const retry of [false, true]) {
      const res = await gatewayFetch<T>("Taly", `${await this.base()}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${await this.accessToken(retry)}`,
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      if (res.status !== 401 || retry) {
        return res
      }
    }
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Taly rejected the access token")
  }

  protected async createCheckout(input: CheckoutRequest): Promise<Checkout> {
    const phone = talyPhone(input.customer.phone)
    if (!phone || !input.customer.email) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Email and a Kuwaiti phone number are required to pay with Taly")
    }
    const [firstName, ...rest] = input.customer.name.split(" ")
    // One line for the whole order: Taly checks items against the total and
    // the order total also carries shipping and discounts.
    const { status, body } = await this.request<{
      message?: string
      errorCode?: string
      talyOrderId?: number
      orderToken?: string
      secureCheckoutUrl?: string
    }>("POST", "/accounts/payment/v2/initiate", {
      merchantOrderId: input.reference,
      language: input.locale,
      totalAmount: input.amount,
      currency: input.currency.toUpperCase(),
      merchantRedirectUrl: input.success_url,
      postBackUrl: `${this.options_.backendUrl.replace(/\/$/, "")}/hooks/payment/taly_taly`,
      platform: "website",
      ...(this.options_.merchantLogo ? { merchantLogo: this.options_.merchantLogo } : {}),
      customerDetails: {
        firstName: firstName || "Customer",
        lastName: rest.join(" ") || undefined,
        countryCode: "965",
        phoneNumber: phone,
        customerEmail: input.customer.email,
      },
      orderItems: [
        { name: "Laly order", nameArabic: "طلب من Laly", quantity: 1, itemPrice: input.amount, type: "physical" },
      ],
    })
    if (status >= 400 || !body?.secureCheckoutUrl) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Taly could not start the checkout: ${body?.errorCode ?? ""} ${body?.message ?? status}`.trim()
      )
    }
    return {
      // Status lookups go by our merchantOrderId.
      external_id: input.reference,
      redirect_url: body.secureCheckoutUrl,
      raw: { talyOrderId: body.talyOrderId, orderToken: body.orderToken },
    }
  }

  protected async fetchStatus(externalId: string): Promise<StatusResult> {
    const { status, body } = await this.request<{ status?: string; totalAmount?: number; finalAmount?: string }>(
      "GET",
      `/accounts/merchant/orders?merchantOrderId=${encodeURIComponent(externalId)}`
    )
    if (status >= 400 || !body?.status) {
      return { status: "pending", raw: { http_status: status } }
    }
    const amount = Number(body.totalAmount)
    return {
      status: talyStatus(body.status),
      amount: Number.isFinite(amount) ? amount : undefined,
      raw: { ...body },
    }
  }

  protected async refund(externalId: string, amount: number) {
    const { status, body } = await this.request<{ refundStatus?: string; message?: string; errorCode?: string }>(
      "PUT",
      "/accounts/merchant/orders/refund",
      {
        orderId: externalId,
        refundAmount: amount,
        currency: "KWD",
        returnReason: "Refund from Laly",
        merchantRefundId: `${externalId}-${Date.now().toString(36)}`,
      }
    )
    if (status >= 400 || body?.refundStatus !== "SUCCESS") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Taly refund failed: ${body?.errorCode ?? ""} ${body?.message ?? status}`.trim()
      )
    }
    return { ...body }
  }

  protected async cancelCheckout(_externalId: string, data: SessionData) {
    const orderToken = data.gateway?.orderToken
    if (typeof orderToken === "string") {
      await this.request("POST", `/accounts/payment/cancel/${encodeURIComponent(orderToken)}`)
    }
  }

  // Taly documents neither the webhook body nor a signature, so the webhook
  // is only a prompt: the order is re-read from Taly's API before anything
  // changes. A forged call can at most trigger that read.
  protected async parseWebhook(payload: ProviderWebhookPayload["payload"]): Promise<WebhookResult | null> {
    const data = (payload.data ?? {}) as Record<string, unknown>
    const reference = [data.merchantOrderId, data.merchant_order_id, data.merchantOrderID].find(
      (v): v is string => typeof v === "string"
    )
    const sessionId = sessionFromReference(reference)
    if (!reference || !sessionId) {
      return null
    }
    const confirmed = await this.fetchStatus(reference)
    return { session_id: sessionId, status: confirmed.status, amount: confirmed.amount }
  }
}

export default TalyProviderService
