import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { AbstractPaymentProvider, BigNumber, MedusaError, PaymentActions } from "@medusajs/framework/utils"

// Shared flow for hosted-checkout gateways (KNET via KlickPay, Taly, Deema):
// create a checkout and send the customer there, then confirm the result
// server-side before the order is placed. The redirect back to the store is
// never trusted on its own.

export type GatewayStatus = "paid" | "authorized" | "pending" | "failed" | "canceled" | "refunded"

export type Checkout = {
  /** The gateway's id for this payment (used for status and refunds). */
  external_id: string
  redirect_url: string
  raw?: Record<string, unknown>
}

export type StatusResult = {
  status: GatewayStatus
  /** Amount the gateway says was paid, in major units, when it reports one. */
  amount?: number
  raw?: Record<string, unknown>
}

export type CheckoutRequest = {
  /** Our reference: the Medusa payment session id. */
  reference: string
  amount: number
  currency: string
  success_url: string
  failure_url: string
  customer: { name: string; email: string; phone: string }
  locale: "ar" | "en"
  items: { sku: string; name: string; quantity: number; unit_price: number }[]
}

export type WebhookResult = {
  /** Medusa payment session id, when the gateway echoes our reference. */
  session_id: string | null
  status: GatewayStatus
  amount?: number
}

export type RedirectOptions = {
  /** Public storefront origin(s); return URLs must start with one of them. */
  storefrontUrls: string[]
}

export type SessionData = {
  session_id?: string
  /** The gateway's own create-checkout response (tokens needed later). */
  gateway?: Record<string, unknown>
  external_id?: string
  redirect_url?: string
  amount?: number
  currency?: string
  return_url?: string
  customer?: Partial<CheckoutRequest["customer"]>
  locale?: string
  items?: CheckoutRequest["items"]
}

// A session can open several checkouts (the cart total changed), and
// gateways reject a reused order id, so each checkout gets a suffix:
// "payses_123.k2x9". The session id is everything before the dot.
export const checkoutReference = (sessionId: string, attempt: boolean) =>
  attempt ? `${sessionId}.${Date.now().toString(36)}` : sessionId
export const sessionFromReference = (reference: string | null | undefined) => {
  const id = (reference ?? "").split(".")[0]
  return id.startsWith("payses_") ? id : null
}

// KWD has 3 decimals; gateways take major units.
// Medusa passes amounts as numbers, strings or BigNumber objects.
export const toMajor = (amount: unknown) => {
  const n =
    typeof amount === "object" && amount !== null
      ? new BigNumber(amount as ConstructorParameters<typeof BigNumber>[0]).numeric
      : Number(amount)
  return Math.round(n * 1000) / 1000
}

export abstract class RedirectPaymentProvider<TOptions extends RedirectOptions> extends AbstractPaymentProvider<TOptions> {
  protected readonly logger_: Logger
  protected readonly options_: TOptions

  constructor(container: { logger: Logger }, options: TOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
  }

  /** Currencies the gateway accepts (lowercase). */
  protected abstract readonly currencies: string[]
  protected abstract createCheckout(input: CheckoutRequest): Promise<Checkout>
  protected abstract fetchStatus(externalId: string, data: SessionData): Promise<StatusResult>
  protected abstract refund(externalId: string, amount: number, full: boolean, data: SessionData): Promise<Record<string, unknown>>
  protected abstract parseWebhook(payload: ProviderWebhookPayload["payload"]): Promise<WebhookResult | null>
  /** Cancels an unpaid checkout when the gateway supports it. */
  protected async cancelCheckout(_externalId: string, _data: SessionData): Promise<void> {}

  /** Gateways that authorize first and capture later override this. */
  protected async captureCheckout(_externalId: string, _data: SessionData): Promise<Record<string, unknown>> {
    return {}
  }

  private returnUrls(returnUrl: unknown, sessionId: string) {
    const url = typeof returnUrl === "string" ? returnUrl : ""
    const allowed = this.options_.storefrontUrls.some((origin) => origin && url.startsWith(origin))
    if (!allowed) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "return_url must be on the storefront")
    }
    const withResult = (result: string) => {
      const u = new URL(url)
      u.searchParams.set("session_id", sessionId)
      u.searchParams.set("result", result)
      return u.toString()
    }
    return { success_url: withResult("success"), failure_url: withResult("failure") }
  }

  private async checkout(input: InitiatePaymentInput | UpdatePaymentInput, sessionId: string, retry = false) {
    const data = (input.data ?? {}) as SessionData
    const currency = input.currency_code.toLowerCase()
    if (!this.currencies.includes(currency)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `This payment method does not support ${currency.toUpperCase()}`)
    }
    const customer = input.context?.customer
    const name =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || data.customer?.name || "Customer"
    const request: CheckoutRequest = {
      reference: checkoutReference(sessionId, retry),
      amount: toMajor(input.amount),
      currency,
      ...this.returnUrls(data.return_url, sessionId),
      customer: {
        name,
        email: customer?.email || data.customer?.email || "",
        phone: customer?.phone || data.customer?.phone || "",
      },
      locale: data.locale === "en" ? "en" : "ar",
      items: data.items ?? [],
    }
    const result = await this.createCheckout(request)
    return {
      id: result.external_id,
      data: {
        session_id: sessionId,
        external_id: result.external_id,
        redirect_url: result.redirect_url,
        gateway: result.raw ?? {},
        amount: request.amount,
        currency,
        return_url: data.return_url,
        customer: request.customer,
        locale: request.locale,
      },
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = input.context?.idempotency_key ?? (input.data as SessionData)?.session_id
    if (!sessionId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Missing payment session id")
    }
    const { id, data } = await this.checkout(input, sessionId)
    return { id, data, status: "pending" }
  }

  // The cart total changed: the old checkout is for the wrong amount.
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const current = (input.data ?? {}) as SessionData
    if (current.external_id && current.amount === toMajor(input.amount) && current.currency === input.currency_code.toLowerCase()) {
      return { data: current, status: "pending" }
    }
    const sessionId = current.session_id ?? input.context?.idempotency_key
    if (!sessionId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Missing payment session id")
    }
    const { data } = await this.checkout({ ...input, data: { ...current, ...(input.data ?? {}) } }, sessionId, true)
    return { data, status: "pending" }
  }

  private toSessionStatus(status: GatewayStatus): PaymentSessionStatus {
    switch (status) {
      case "paid":
        return "captured"
      case "authorized":
        return "authorized"
      case "failed":
        return "error"
      case "canceled":
        return "canceled"
      case "refunded":
        return "captured"
      default:
        return "pending"
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.external_id) {
      return { status: "error", data }
    }
    const result = await this.fetchStatus(data.external_id, data)
    // A paid amount below the order total must never place the order.
    if (
      (result.status === "paid" || result.status === "authorized") &&
      result.amount !== undefined &&
      data.amount !== undefined &&
      result.amount + 0.0005 < data.amount
    ) {
      this.logger_.warn(
        `${this.getIdentifier()}: paid ${result.amount} for session ${data.session_id} expecting ${data.amount}`
      )
      return { status: "error", data: { ...data, gateway_status: result.raw } }
    }
    return { status: this.toSessionStatus(result.status), data: { ...data, gateway_status: result.raw } }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.external_id) {
      return { data }
    }
    const capture = await this.captureCheckout(data.external_id, data)
    return { data: { ...data, ...(Object.keys(capture).length ? { capture } : {}) } }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.external_id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Nothing to refund: payment has no gateway id")
    }
    const amount = toMajor(input.amount)
    const full = data.amount !== undefined && amount + 0.0005 >= data.amount
    const result = await this.refund(data.external_id, amount, full, data)
    const refunds = Array.isArray((data as Record<string, unknown>).refunds)
      ? ((data as Record<string, unknown>).refunds as unknown[])
      : []
    return { data: { ...data, refunds: [...refunds, { amount, full, result }] } }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (data.external_id) {
      await this.cancelCheckout(data.external_id, data).catch((error) =>
        this.logger_.warn(`${this.getIdentifier()}: cancel failed: ${(error as Error).message}`)
      )
    }
    return { data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input)
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.external_id) {
      return { status: "pending", data }
    }
    const result = await this.fetchStatus(data.external_id, data)
    return { status: this.toSessionStatus(result.status), data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const data = (input.data ?? {}) as SessionData
    if (!data.external_id) {
      return { data }
    }
    const result = await this.fetchStatus(data.external_id, data)
    return { data: { ...data, gateway_status: result.raw } }
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const none = { action: PaymentActions.NOT_SUPPORTED, data: { session_id: "", amount: new BigNumber(0) } }
    let result: WebhookResult | null
    try {
      result = await this.parseWebhook(payload)
    } catch (error) {
      this.logger_.warn(`${this.getIdentifier()}: rejected webhook: ${(error as Error).message}`)
      return none
    }
    if (!result?.session_id) {
      return none
    }
    const data = { session_id: result.session_id, amount: new BigNumber(result.amount ?? 0) }
    switch (result.status) {
      case "paid":
        return { action: PaymentActions.SUCCESSFUL, data }
      case "authorized":
        return { action: PaymentActions.AUTHORIZED, data }
      case "failed":
        return { action: PaymentActions.FAILED, data }
      case "canceled":
        return { action: PaymentActions.CANCELED, data }
      default:
        return none
    }
  }
}

/** HTTP helper with a timeout and readable gateway errors. */
export async function gatewayFetch<T>(
  name: string,
  url: string,
  init: RequestInit & { timeoutMs?: number }
): Promise<{ status: number; body: T }> {
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeoutMs ?? 20_000) })
  } catch (error) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `${name} unreachable: ${(error as Error).message}`)
  }
  const text = await response.text()
  let body: unknown = text
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    // keep text
  }
  return { status: response.status, body: body as T }
}
