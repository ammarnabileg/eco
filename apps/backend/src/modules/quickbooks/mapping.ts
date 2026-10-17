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
  customerId: string
  paymentMethodId?: string | null
  depositAccountId?: string | null
  currency?: string | null
}

export const roundTo = (n: number, decimals: number) => {
  const f = 10 ** decimals
  return Math.round(n * f) / f
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

/**
 * A SalesReceipt (paid) or Invoice (unpaid) body for an order: one line per
 * item, then delivery and the order-level discount. QuickBooks computes the
 * total from the lines, so it must equal the store total.
 */
export function orderToSale(order: OrderInput, refs: ItemRefs, decimals = 3) {
  const r = (n: number) => roundTo(n, decimals)
  const Line: Record<string, unknown>[] = []
  for (const line of order.lines) {
    const itemId = line.variant_id ? refs.items[line.variant_id] : undefined
    if (!itemId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `No QuickBooks item for "${line.title}"`)
    }
    const description = [line.title, line.variant_title && line.variant_title !== "Default" ? line.variant_title : null, line.addons]
      .filter(Boolean)
      .join(" — ")
    Line.push({
      DetailType: "SalesItemLineDetail",
      Amount: r(line.subtotal),
      Description: clip(description, 4000),
      SalesItemLineDetail: { ItemRef: { value: itemId }, Qty: line.quantity, UnitPrice: r(line.unit_price) },
    })
  }
  if (order.shipping_total > 0) {
    Line.push({
      DetailType: "SalesItemLineDetail",
      Amount: r(order.shipping_total),
      Description: "Delivery / التوصيل",
      SalesItemLineDetail: { ItemRef: { value: refs.shippingItemId }, Qty: 1, UnitPrice: r(order.shipping_total) },
    })
  }
  if (order.discount_total > 0) {
    Line.push({
      DetailType: "DiscountLineDetail",
      Amount: r(order.discount_total),
      DiscountLineDetail: { PercentBased: false },
    })
  }
  const computed = r(
    Line.reduce((sum, l) => sum + (l.DetailType === "DiscountLineDetail" ? -1 : 1) * (l.Amount as number), 0)
  )
  return {
    payload: {
      DocNumber: clip(`LALY-${order.display_id}`, 21),
      TxnDate: new Date(order.created_at).toISOString().slice(0, 10),
      CustomerRef: { value: refs.customerId },
      ...(refs.currency ? { CurrencyRef: { value: refs.currency } } : {}),
      ...(refs.paymentMethodId ? { PaymentMethodRef: { value: refs.paymentMethodId } } : {}),
      ...(refs.depositAccountId ? { DepositToAccountRef: { value: refs.depositAccountId } } : {}),
      ...(order.email ? { BillEmail: { Address: order.email } } : {}),
      PrivateNote: clip(`Laly order ${order.id}${order.provider_id ? ` · ${order.provider_id}` : ""}`, 4000),
      Line,
    },
    /** Difference between QuickBooks' sum and the store total (should be 0). */
    mismatch: r(computed - order.total),
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
