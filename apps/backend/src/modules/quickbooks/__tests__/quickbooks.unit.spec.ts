import { decrypt, encrypt } from "../crypto"
import { authorizeUrl, qboString, signState, verifyState } from "../client"
import { customerPayload, orderToSale, paymentMethodName, variantToItem } from "../mapping"

describe("QuickBooks tokens and OAuth state", () => {
  it("encrypts tokens and refuses a wrong key", () => {
    const sealed = encrypt("refresh-token", "key-1")
    expect(sealed).not.toContain("refresh-token")
    expect(decrypt(sealed, "key-1")).toBe("refresh-token")
    expect(() => decrypt(sealed, "key-2")).toThrow()
  })

  it("accepts only its own, unexpired state", () => {
    const now = 1_000_000
    const state = signState("s", 600, now)
    expect(verifyState(state, "s", now + 1000)).toBe(true)
    expect(verifyState(state, "other", now)).toBe(false)
    expect(verifyState(state, "s", now + 601_000)).toBe(false)
    expect(verifyState(`${state}x`, "s", now)).toBe(false)
  })

  it("builds the Intuit consent URL", () => {
    const url = new URL(authorizeUrl("cid", "https://api.laly.kw/quickbooks/callback", "st"))
    expect(url.searchParams.get("scope")).toBe("com.intuit.quickbooks.accounting")
    expect(url.searchParams.get("redirect_uri")).toBe("https://api.laly.kw/quickbooks/callback")
  })

  it("escapes quotes in queries", () => {
    expect(qboString("Ali's shop")).toBe("'Ali\\'s shop'")
  })
})

describe("QuickBooks mapping", () => {
  const order = {
    id: "order_1",
    display_id: 1001,
    created_at: "2026-10-17T10:00:00Z",
    currency_code: "kwd",
    email: "a@b.kw",
    provider_id: "pp_klickpay_knet",
    lines: [
      { variant_id: "v1", title: "Archer BE230", quantity: 2, unit_price: 27.9, subtotal: 55.8 },
      {
        variant_id: "v2",
        title: "VIGI NVR",
        variant_title: "Default",
        quantity: 1,
        unit_price: 56.5,
        subtotal: 56.5,
        addons: "هارد مراقبة: 1 تيرا",
      },
    ],
    shipping_total: 1.5,
    discount_total: 2.25,
    total: 111.55,
  }
  const refs = { items: { v1: "11", v2: "12" }, shippingItemId: "90", customerId: "7", paymentMethodId: "3", currency: "KWD" }

  it("builds a receipt whose lines add up to the store total with 3 decimals", () => {
    const { payload, mismatch } = orderToSale(order, refs)
    expect(mismatch).toBe(0)
    expect(payload.DocNumber).toBe("LALY-1001")
    expect(payload.Line).toHaveLength(4)
    expect(payload.Line[1]).toMatchObject({ Description: "VIGI NVR — هارد مراقبة: 1 تيرا" })
    expect(payload.Line[3]).toMatchObject({ DetailType: "DiscountLineDetail", Amount: 2.25 })
    expect(payload).toMatchObject({ CurrencyRef: { value: "KWD" }, PaymentMethodRef: { value: "3" } })
  })

  it("reports a total QuickBooks would compute differently", () => {
    expect(orderToSale({ ...order, total: 100 }, refs).mismatch).toBe(11.55)
  })

  it("refuses a line without a synced item", () => {
    expect(() => orderToSale(order, { ...refs, items: { v1: "11" } })).toThrow("VIGI NVR")
  })

  it("names items uniquely within 100 characters and without colons", () => {
    const item = variantToItem(
      { id: "v1", sku: "DS-2CD2047G2-LU", title: "Default", price: 23.5, product_title: "x".repeat(150) + ":" },
      "55"
    )
    expect(item.Name.length).toBeLessThanOrEqual(100)
    expect(item.Name.endsWith("[DS-2CD2047G2-LU]")).toBe(true)
    expect(item).toMatchObject({ Type: "NonInventory", UnitPrice: 23.5, IncomeAccountRef: { value: "55" } })
  })

  it("labels gateways and customers", () => {
    expect(paymentMethodName("pp_taly_taly")).toBe("Taly")
    expect(paymentMethodName("pp_klickpay_knet")).toBe("KNET")
    expect(customerPayload({ name: "أحمد", email: "a@b.kw" }).DisplayName).toBe("أحمد (a@b.kw)")
  })
})
