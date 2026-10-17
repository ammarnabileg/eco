import { createHmac } from "node:crypto"

import { deemaRefundReference, deemaStatus } from "../../payment-deema/service"
import { KlickPayClient, klickPayStatus, verifyKlickPaySignature } from "../../payment-klickpay/client"
import { talyPhone, talyStatus } from "../../payment-taly/service"
import {
  Checkout,
  CheckoutRequest,
  RedirectOptions,
  RedirectPaymentProvider,
  sessionFromReference,
  StatusResult,
  toMajor,
  WebhookResult,
} from "../base"

const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } as never

class FakeGateway extends RedirectPaymentProvider<RedirectOptions> {
  static identifier = "fake"
  protected readonly currencies = ["kwd"]
  requests: CheckoutRequest[] = []
  status: StatusResult = { status: "pending" }

  protected async createCheckout(input: CheckoutRequest): Promise<Checkout> {
    this.requests.push(input)
    return { external_id: `ext-${this.requests.length}`, redirect_url: "https://pay.example/x" }
  }
  protected async fetchStatus(): Promise<StatusResult> {
    return this.status
  }
  protected async refund() {
    return { ok: true }
  }
  protected async parseWebhook(): Promise<WebhookResult | null> {
    return null
  }
}

const gateway = () => new FakeGateway({ logger }, { storefrontUrls: ["https://laly.example"] })
const initiate = (g: FakeGateway, returnUrl = "https://laly.example/api/payment-redirect?cart_id=cart_1") =>
  g.initiatePayment({
    amount: 27.4,
    currency_code: "kwd",
    data: { return_url: returnUrl, customer: { name: "أحمد", email: "a@b.kw", phone: "+96599991234" } },
    context: { idempotency_key: "payses_01ABC" },
  })

describe("redirect payment flow", () => {
  it("opens a checkout with the session as reference and return URLs carrying the result", async () => {
    const g = gateway()
    const res = await initiate(g)
    expect(res).toMatchObject({ id: "ext-1", status: "pending" })
    expect(g.requests[0].reference).toBe("payses_01ABC")
    expect(new URL(g.requests[0].success_url).searchParams.get("result")).toBe("success")
    expect(new URL(g.requests[0].failure_url).searchParams.get("session_id")).toBe("payses_01ABC")
  })

  it("refuses return URLs outside the storefront", async () => {
    await expect(initiate(gateway(), "https://evil.example/steal")).rejects.toThrow("storefront")
  })

  it("places the order only when the gateway confirms the full amount", async () => {
    const g = gateway()
    const { data } = await initiate(g)
    g.status = { status: "paid", amount: 27.4 }
    expect((await g.authorizePayment({ data })).status).toBe("captured")
    g.status = { status: "paid", amount: 1 }
    expect((await g.authorizePayment({ data })).status).toBe("error")
    g.status = { status: "pending" }
    expect((await g.authorizePayment({ data })).status).toBe("pending")
  })

  it("opens a new checkout with a fresh reference when the total changes", async () => {
    const g = gateway()
    const { data } = await initiate(g)
    const same = await g.updatePayment({ amount: 27.4, currency_code: "kwd", data })
    expect(g.requests).toHaveLength(1)
    expect(same.data?.external_id).toBe("ext-1")
    const changed = await g.updatePayment({ amount: 30, currency_code: "kwd", data })
    expect(changed.data?.external_id).toBe("ext-2")
    expect(g.requests[1].reference).toMatch(/^payses_01ABC\.[a-z0-9]+$/)
    expect(sessionFromReference(g.requests[1].reference)).toBe("payses_01ABC")
  })
})

describe("toMajor", () => {
  it("reads numbers, strings and Medusa BigNumbers to fils precision", () => {
    const { BigNumber } = jest.requireActual("@medusajs/framework/utils")
    expect(toMajor(27.4)).toBe(27.4)
    expect(toMajor("10.0004")).toBe(10)
    expect(toMajor(new BigNumber(17.4))).toBe(17.4)
  })
})

describe("KlickPay", () => {
  const secret = "whsec"
  const body = JSON.stringify({ event_type: "payment.success", invoice_id: "QI1" })
  const now = 1_781_867_283_000
  const sign = (raw: string) => createHmac("sha256", secret).update(raw).digest("hex")

  it("accepts a correctly signed, fresh webhook and rejects tampering or replays", () => {
    const headers = { "x-klickpay-signature": sign(body), "x-klickpay-timestamp": String(now / 1000) }
    expect(verifyKlickPaySignature(body, headers, secret, 300, now)).toBe(true)
    expect(verifyKlickPaySignature(body.replace("QI1", "QI2"), headers, secret, 300, now)).toBe(false)
    expect(verifyKlickPaySignature(body, headers, secret, 300, now + 10 * 60_000)).toBe(false)
    expect(verifyKlickPaySignature(body, headers, "", 300, now)).toBe(false)
  })

  it("maps payment status responses", () => {
    expect(klickPayStatus({ status: "paid", result: "CAPTURED" })).toBe("paid")
    expect(klickPayStatus({ status: "fully_refunded" })).toBe("refunded")
    expect(klickPayStatus({ event: "payment.declined" })).toBe("failed")
    expect(klickPayStatus({ status: "pending" })).toBe("pending")
    expect(klickPayStatus(undefined)).toBe("pending")
  })

  it("finds the access token wherever the API puts it", () => {
    expect(KlickPayClient.readToken({ data: { access_token: "a", expires_in: 3600 } })).toEqual({ token: "a", expiresIn: 3600 })
    expect(KlickPayClient.readToken({ token: "b" })).toEqual({ token: "b", expiresIn: null })
  })
})

describe("BNPL status mapping", () => {
  it("Deema", () => {
    expect(deemaStatus("fully_captured")).toBe("paid")
    expect(deemaStatus("captured")).toBe("paid")
    expect(deemaStatus("declined_by_deema")).toBe("failed")
    expect(deemaStatus("expired")).toBe("canceled")
    expect(deemaStatus("pending")).toBe("pending")
    expect(deemaStatus("partially_captured")).toBe("paid")
    expect(deemaStatus("fully_refunded")).toBe("refunded")
    // One Return Invoice ID per refund; a retried refund keeps its own.
    expect(deemaRefundReference({ session_id: "payses_1" })).toBe("payses_1-R1")
    expect(deemaRefundReference({ session_id: "payses_1", refunds: [{}] } as never)).toBe("payses_1-R2")
  })

  it("Taly", () => {
    expect(talyStatus("CONFIRMED")).toBe("paid")
    expect(talyStatus("REJECTED")).toBe("failed")
    expect(talyStatus("CANCELLED")).toBe("canceled")
    expect(talyStatus("INITIATED")).toBe("pending")
    expect(talyPhone("+965 9999 1234")).toBe("99991234")
    expect(talyPhone("55555333")).toBe("55555333")
  })
})
