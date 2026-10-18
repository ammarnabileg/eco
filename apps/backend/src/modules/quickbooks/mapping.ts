import { MedusaError } from "@medusajs/framework/utils"

// Store records to QuickBooks payloads. Pure functions, unit-tested.

export type OrderLine = {
  variant_id: string | null
  title: string
  variant_title?: string | null
  quantity: number
  unit_price: number
  /** Line amount before discounts. */
  subtotal: number
  addons?: string | null
}

export type OrderInput = {
  id: string
  display_id: number | string
  created_at: string | Date
  currency_code: string
  email: string | null
  lines: OrderLine[]
  shipping_total: number
  discount_total: number
  total: number
  provider_id: string | null
}

export type ItemRefs = {
  /** QuickBooks Item id per variant id. */
  items: Record<string, string>
  shippingItemId: string
  roundingItemId?: string | null
  customerId: string
  paymentMethodId?: string | null
  depositAccountId?: string | null
  currency?: string | null
}

// Half-up, immune to binary float (29.985 * 100 = 2998.4999...).
export const roundTo = (n: number, decimals: number) => {
  const f = 10 ** decimals
  return Math.sign(n) * (Math.round(Math.abs(n) * f + 1e-7) / f)
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

/** Payment method label shown in QuickBooks for a Medusa provider id. */
export function paymentMethodName(providerId: string | null): string | null {
  if (!providerId) return null
  if (providerId.startsWith("pp_klickpay_knet")) return "KNET"
  if (providerId.startsWith("pp_klickpay_card")) return "Card (Visa/Mastercard)"
  if (providerId.startsWith("pp_klickpay_apple_pay")) return "Apple Pay"
  if (providerId.startsWith("pp_klickpay_google_pay")) return "Google Pay"
  if (providerId.startsWith("pp_klickpay_samsung_pay")) return "Samsung Pay"
  if (providerId.startsWith("pp_taly")) return "Taly"
  if (providerId.startsWith("pp_deema")) return "Deema"
  if (providerId.startsWith("pp_system")) return "Cash / manual"
  return providerId.slice(0, 31)
}

// QuickBooks keeps line amounts to 2 decimals (rounded half-up) and unit
// prices to 7. KWD has 3, so fils cannot be booked: unit prices go as they
// are, line amounts are rounded to 2, and a rounding line makes the
// QuickBooks total equal the store total rounded to 2 decimals.
export const QBO_AMOUNT_DECIMALS = 2

/**
 * A SalesReceipt (paid) or Invoice (unpaid) body for an order: one line per
 * item, then delivery, the order-level discount and any rounding.
 */
export function orderToSale(order: OrderInput, refs: ItemRefs, priceDecimals = 3) {
  const amount = (n: number) => roundTo(n, QBO_AMOUNT_DECIMALS)
  const price = (n: number) => roundTo(n, priceDecimals)
  const Line: Record<string, unknown>[] = []
  const sale = (itemId: string, qty: number, unitPrice: number, description: string) =>
    Line.push({
      DetailType: "SalesItemLineDetail",
      Amount: amount(unitPrice * qty),
      Description: clip(description, 4000),
      SalesItemLineDetail: { ItemRef: { value: itemId }, Qty: qty, UnitPrice: price(unitPrice) },
    })
  for (const line of order.lines) {
    const itemId = line.variant_id ? refs.items[line.variant_id] : undefined
    if (!itemId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `No QuickBooks item for "${line.title}"`)
    }
    const description = [line.title, line.variant_title && line.variant_title !== "Default" ? line.variant_title : null, line.addons]
      .filter(Boolean)
      .join(" — ")
    sale(itemId, line.quantity, line.unit_price, description)
  }
  if (order.shipping_total > 0) {
    sale(refs.shippingItemId, 1, order.shipping_total, "Delivery / التوصيل")
  }

  const target = amount(order.total)
  const sales = Line.reduce((sum, l) => sum + (l.Amount as number), 0)
  let discount = amount(order.discount_total)
  const diff = amount(target - (sales - discount))
  if (diff < 0) {
    // The rounded lines overshoot: absorb it in the discount.
    discount = amount(discount - diff)
  } else if (diff > 0) {
    if (!refs.roundingItemId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No QuickBooks rounding item")
    }
    sale(refs.roundingItemId, 1, diff, "Rounding / فرق تقريب")
  }
  if (discount > 0) {
    Line.push({ DetailType: "DiscountLineDetail", Amount: discount, DiscountLineDetail: { PercentBased: false } })
  }

  const booked = amount(
    Line.reduce((sum, l) => sum + (l.DetailType === "DiscountLineDetail" ? -1 : 1) * (l.Amount as number), 0)
  )
  // What QuickBooks cannot hold: the third decimal of the store total.
  const fils = roundTo(order.total - target, 3)
  return {
    payload: {
      DocNumber: clip(`LALY-${order.display_id}`, 21),
      TxnDate: new Date(order.created_at).toISOString().slice(0, 10),
      CustomerRef: { value: refs.customerId },
      ...(refs.currency ? { CurrencyRef: { value: refs.currency } } : {}),
      ...(refs.paymentMethodId ? { PaymentMethodRef: { value: refs.paymentMethodId } } : {}),
      ...(refs.depositAccountId ? { DepositToAccountRef: { value: refs.depositAccountId } } : {}),
      ...(order.email ? { BillEmail: { Address: order.email } } : {}),
      PrivateNote: clip(
        `Laly order ${order.id} · total ${order.total.toFixed(3)} ${order.currency_code.toUpperCase()}` +
          (fils !== 0 ? ` (QuickBooks rounds to 2 decimals: ${fils > 0 ? "-" : "+"}${Math.abs(fils).toFixed(3)})` : "") +
          (order.provider_id ? ` · ${order.provider_id}` : ""),
        4000
      ),
      Line,
    },
    /** QuickBooks' total minus the store total rounded to 2 decimals (always 0). */
    mismatch: amount(booked - target),
    fils,
  }
}

/** A QuickBooks NonInventory item for a variant (the store keeps the stock). */
export function variantToItem(
  v: { id: string; sku?: string | null; title?: string | null; price?: number | null; product_title: string },
  incomeAccountId: string,
  decimals = 3
) {
  const variant = v.title && v.title !== "Default" ? ` ${v.title}` : ""
  const sku = v.sku ? ` [${v.sku}]` : ""
  // Names are unique in QuickBooks and limited to 100 characters.
  const base = `${v.product_title}${variant}`
  const Name = clip(base, 100 - sku.length) + sku
  return {
    Name: Name.replace(/:/g, "-"),
    Type: "NonInventory",
    ...(v.sku ? { Sku: clip(v.sku, 100) } : {}),
    ...(v.price != null ? { UnitPrice: roundTo(v.price, decimals) } : {}),
    IncomeAccountRef: { value: incomeAccountId },
    Active: true,
  }
}

/** Customer display names are unique; the email keeps them distinct. */
export function customerPayload(c: { name: string; email: string | null; phone?: string | null; currency?: string | null }) {
  const label = c.email ? `${c.name} (${c.email})` : c.name
  return {
    DisplayName: clip(label.replace(/:/g, "-"), 500),
    ...(c.email ? { PrimaryEmailAddr: { Address: c.email } } : {}),
    ...(c.phone ? { PrimaryPhone: { FreeFormNumber: c.phone } } : {}),
    ...(c.currency ? { CurrencyRef: { value: c.currency } } : {}),
  }
}

/**
 * The CurrencyRef to send, or null to leave it out. A company whose home
 * currency is the store's needs none (and works without Multicurrency);
 * any other company must have Multicurrency on with that currency added.
 */
export function currencyToSend(store: string, prefs: { home: string | null; multicurrency: boolean }): string | null {
  const code = store.toUpperCase()
  if (!prefs.home || prefs.home.toUpperCase() === code) return null
  if (!prefs.multicurrency) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `QuickBooks company currency is ${prefs.home} and Multicurrency is off. In QuickBooks: Settings > Account and settings > Advanced > Currency, turn on Multicurrency and add ${code} (or use a company whose home currency is ${code}).`
    )
  }
  return code
}
