import { ProviderWebhookPayload } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { IntegrationValues } from "../integrations/definitions"
import {
  Checkout,
  CheckoutRequest,
  ProviderContainer,
  RedirectOptions,
  RedirectPaymentProvider,
  sessionFromReference,
  StatusResult,
  WebhookResult,
} from "../payment-redirect/base"
import { KLICKPAY_STAGING_URL, KlickPayClient, KlickPayMethod, klickPayStatus, verifyKlickPaySignature } from "./client"

export type KlickPayOptions = RedirectOptions & {
  clientId?: string
  clientSecret?: string
  /** Secret saved as secret_key in KlickPay's webhook settings. */
  webhookSecret?: string
  baseUrl?: string
  /** Which KlickPay checkout this provider instance opens. */
  method: KlickPayMethod
  /** The provider id in Medusa (knet, card, apple_pay, ...), as listed in the admin. */
  methodId?: string
}

/** The admin stores a list; the environment a comma-separated string. */
export const listOf = (v: unknown) =>
  (Array.isArray(v) ? v : String(v ?? "").split(",")).map((x) => String(x).trim()).filter(Boolean)

const METHODS: KlickPayMethod[] = ["knet", "mpgs", "apple-pay", "google-pay", "samsung-pay", "general-link"]

// Clients are shared across the provider instances (knet, card, apple pay)
// so they share one access token.
const clients = new Map<string, KlickPayClient>()

/**
 * KNET, cards (MPGS) and wallets through KlickPay. One class, registered once
 * per method in medusa-config (pp_klickpay_knet, pp_klickpay_card, ...).
 * Keys come from the admin's integrations settings (or the environment).
 */
class KlickPayProviderService extends RedirectPaymentProvider<KlickPayOptions> {
  static identifier = "klickpay"
  protected readonly currencies = ["kwd"]
  protected readonly integration = "klickpay"

  static validateOptions(options: Record<string, unknown>) {
    if (!METHODS.includes(options.method as KlickPayMethod)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `KlickPay method must be one of ${METHODS.join(", ")}`)
    }
  }

  constructor(container: ProviderContainer, options: KlickPayOptions) {
    super(container, options)
  }

  protected fromSettings(values: IntegrationValues): Partial<KlickPayOptions> {
    return {
      clientId: values.client_id as string | undefined,
      clientSecret: values.client_secret as string | undefined,
      webhookSecret: values.webhook_secret as string | undefined,
      baseUrl: values.base_url as string | undefined,
    }
  }

  // Each method can be switched off on its own in the admin.
  protected async available() {
    const settings = await this.settings()
    return settings.active && (!this.options_.methodId || listOf(settings.values.methods).includes(this.options_.methodId))
  }

  private async client(): Promise<KlickPayClient> {
    const { baseUrl, clientId, clientSecret } = await this.opts()
    if (!clientId || !clientSecret) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "KlickPay is not configured")
    }
    const base = (baseUrl || KLICKPAY_STAGING_URL).replace(/\/$/, "")
    const key = `${base}|${clientId}|${clientSecret}`
    if (!clients.has(key)) {
      clients.set(key, new KlickPayClient(base, clientId, clientSecret))
    }
    return clients.get(key)!
  }

  protected async createCheckout(input: CheckoutRequest): Promise<Checkout> {
    if (!input.customer.email || !input.customer.phone) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Email and phone are required to pay with KlickPay")
    }
    const link = await (await this.client()).createPayment(this.options_.method, {
      reference: input.reference,
      amount: input.amount,
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      successUrl: input.success_url,
      errorUrl: input.failure_url,
      items: input.items,
    })
    return { external_id: link.payment_id, redirect_url: link.payment_url, raw: { ...link } }
  }

  protected async fetchStatus(externalId: string): Promise<StatusResult> {
    const res = await (await this.client()).status(externalId)
    if (!res.success && !res.data) {
      // Unknown to KlickPay or a transient error: never treat as paid.
      return { status: "pending", raw: { code: res.code, message: res.message } }
    }
    const amount = Number(res.data?.amount)
    return {
      status: klickPayStatus(res.data),
      amount: Number.isFinite(amount) ? amount : undefined,
      raw: { ...(res.data ?? {}) },
    }
  }

  protected async refund(externalId: string, amount: number, full: boolean) {
    const res = await (await this.client()).refund(externalId, full ? null : amount)
    if (res.code === "INSUFFICIENT_BALANCE") {
      // Queued by KlickPay until the merchant wallet is funded; the refund
      // webhook reports the outcome. Recorded so staff can follow up.
      this.logger_.warn(`KlickPay refund for ${externalId} is pending wallet funding: ${JSON.stringify(res.details ?? {})}`)
      return { pending_collection: true, ...(res.details ?? {}) }
    }
    if (!res.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `KlickPay refund failed: ${res.code ?? ""} ${res.message ?? ""}`.trim()
      )
    }
    return { ...(res.data ?? {}) }
  }

  protected async parseWebhook(payload: ProviderWebhookPayload["payload"]): Promise<WebhookResult | null> {
    const secret = (await this.opts()).webhookSecret ?? ""
    if (!verifyKlickPaySignature(payload.rawData, payload.headers, secret)) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "bad or missing X-KlickPay-Signature")
    }
    const data = payload.data as Record<string, unknown>
    const event = String(data.event_type ?? "")
    if (!event.startsWith("payment.")) {
      return null
    }
    // Our session id goes out as transction_reference and comes back as
    // client_reference. Payment events are not documented to carry it; the
    // reconcile job and the customer's redirect cover payments without it.
    const reference = typeof data.client_reference === "string" ? data.client_reference : null
    const invoice = String(data.invoice_id ?? data.payment_id ?? "")
    // The webhook is a hint: the status API is the source of truth.
    const confirmed = invoice ? await this.fetchStatus(invoice) : null
    return {
      session_id: sessionFromReference(reference),
      status: confirmed?.status ?? klickPayStatus({ event }),
      amount: confirmed?.amount,
    }
  }
}

export default KlickPayProviderService
