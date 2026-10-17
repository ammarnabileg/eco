import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { QboError } from "../../modules/quickbooks/client"
import {
  customerPayload,
  OrderLine,
  orderToSale,
  paymentMethodName,
  roundTo,
  variantToItem,
} from "../../modules/quickbooks/mapping"
import { findOrCreateByName, QboContext, recordFailed, recordSynced, withQuickBooks } from "./qbo"

// Store → QuickBooks. The store is the source of truth: products become
// Items, paid orders SalesReceipts (unpaid ones Invoices), refunds
// RefundReceipts. Every create carries a request id, so a retried call
// never books the same order twice.

const GENERIC_ITEM = "__generic"

type VariantRow = {
  id: string
  title?: string | null
  sku?: string | null
  product?: { title?: string | null } | null
  prices?: { amount: number; currency_code: string }[] | null
}

async function namedItem(ctx: QboContext, name: string, field: "shipping_item_id" | "refund_item_id" | null) {
  if (field && ctx.connection[field]) {
    return ctx.connection[field] as string
  }
  if (!ctx.connection.income_account_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Pick the QuickBooks income account in Settings > QuickBooks")
  }
  const item = await findOrCreateByName(
    ctx,
    "Item",
    "Name",
    name,
    { Name: name, Type: "Service", IncomeAccountRef: { value: ctx.connection.income_account_id } },
    `item-${name}`.slice(0, 50)
  )
  if (field) {
    await ctx.service.updateQbConnections({ id: ctx.connection.id, [field]: item.Id })
  }
  return item.Id
}

/** Creates or updates the QuickBooks Item of a variant; returns its id. */
async function upsertVariantItem(ctx: QboContext, v: VariantRow, update: boolean): Promise<string> {
  const existing = await ctx.service.findRecord("variant", v.id)
  if (existing?.qb_id && !update) {
    return existing.qb_id
  }
  if (!ctx.connection.income_account_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Pick the QuickBooks income account in Settings > QuickBooks")
  }
  const price = v.prices?.find((p) => p.currency_code === "kwd")?.amount ?? null
  const payload = variantToItem(
    { id: v.id, sku: v.sku, title: v.title, price, product_title: v.product?.title ?? "Product" },
    ctx.connection.income_account_id,
    ctx.decimals
  )
  let item: { Id: string; SyncToken?: string }
  if (existing?.qb_id) {
    try {
      item = await ctx.client.update("Item", { ...payload, Id: existing.qb_id, SyncToken: existing.qb_sync_token ?? "0" })
    } catch (error) {
      // Edited in QuickBooks since: re-read the SyncToken and retry once.
      if (!(error instanceof QboError && error.code === "5010")) throw error
      const fresh = await ctx.client.read<{ Id: string; SyncToken: string }>("Item", existing.qb_id)
      item = await ctx.client.update("Item", { ...payload, Id: existing.qb_id, SyncToken: fresh.SyncToken })
    }
  } else {
    item = await findOrCreateByName(ctx, "Item", "Name", payload.Name, payload, `variant-${v.id}`.slice(0, 50))
  }
  await recordSynced(ctx, "variant", v.id, { type: "Item", id: item.Id, syncToken: item.SyncToken })
  return item.Id
}

async function loadVariants(container: MedusaContainer, filters: Record<string, unknown>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "title", "sku", "product.title", "prices.amount", "prices.currency_code"],
    filters,
  })
  return data as VariantRow[]
}

export async function syncProductToQuickBooks(container: MedusaContainer, productId: string) {
  const variants = await loadVariants(container, { product_id: productId })
  return withQuickBooks(container, async (ctx) => {
    for (const v of variants) {
      try {
        await upsertVariantItem(ctx, v, true)
      } catch (error) {
        await recordFailed(container, "variant", v.id, error)
      }
    }
    return variants.length
  })
}

async function paymentMethodId(ctx: QboContext, providerId: string | null) {
  const name = paymentMethodName(providerId)
  if (!name) return null
  const existing = await ctx.service.findRecord("payment_method", name)
  if (existing?.qb_id) return existing.qb_id
  const pm = await findOrCreateByName(ctx, "PaymentMethod", "Name", name, { Name: name }, `pm-${name}`.slice(0, 50))
  await recordSynced(ctx, "payment_method", name, { type: "PaymentMethod", id: pm.Id })
  return pm.Id
}

type OrderRow = {
  id: string
  display_id: number
  created_at: string
  currency_code: string
  email: string | null
  total: number
  shipping_total: number
  discount_total: number
  customer_id: string | null
  customer?: { first_name?: string | null; last_name?: string | null; phone?: string | null } | null
  shipping_address?: { first_name?: string | null; last_name?: string | null; phone?: string | null } | null
  items?: {
    variant_id: string | null
    title: string
    variant_title?: string | null
    quantity: number
    unit_price: number
    subtotal: number
    metadata?: Record<string, unknown> | null
  }[]
  payment_collections?: { payments?: { provider_id: string; captured_at?: string | null }[] }[]
}

async function customerId(ctx: QboContext, order: OrderRow) {
  const key = order.customer_id ?? `email:${order.email ?? order.id}`
  const existing = await ctx.service.findRecord("customer", key)
  if (existing?.qb_id) return existing.qb_id
  const person = order.shipping_address ?? order.customer ?? {}
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ") || "Laly customer"
  const payload = customerPayload({
    name,
    email: order.email,
    phone: person.phone ?? order.customer?.phone ?? null,
    currency: ctx.connection.currency,
  })
  const c = await findOrCreateByName(ctx, "Customer", "DisplayName", payload.DisplayName, payload, `customer-${key}`.slice(0, 50))
  await recordSynced(ctx, "customer", key, { type: "Customer", id: c.Id })
  return c.Id
}

const addonText = (metadata?: Record<string, unknown> | null) => {
  const addons = (metadata?.addons ?? []) as { group_ar?: string; name_ar?: string }[]
  return addons.length ? addons.map((a) => `${a.group_ar}: ${a.name_ar}`).join("، ") : null
}

export async function syncOrderToQuickBooks(container: MedusaContainer, orderId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "currency_code",
      "email",
      "total",
      "shipping_total",
      "discount_total",
      "customer_id",
      "customer.first_name",
      "customer.last_name",
      "customer.phone",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.phone",
      "items.variant_id",
      "items.title",
      "items.variant_title",
      "items.quantity",
      "items.unit_price",
      "items.subtotal",
      "items.metadata",
      "payment_collections.payments.provider_id",
      "payment_collections.payments.captured_at",
    ],
    filters: { id: orderId },
  })
  const order = data[0] as unknown as OrderRow | undefined
  if (!order) return null

  return withQuickBooks(container, async (ctx) => {
    const done = await ctx.service.findRecord("order", order.id)
    if (done?.status === "synced" && done.qb_id) {
      return done.qb_id
    }
    try {
      const payments = (order.payment_collections ?? []).flatMap((pc) => pc.payments ?? [])
      const paid = payments.some((p) => p.captured_at)
      const provider = payments[0]?.provider_id ?? null

      const items: Record<string, string> = {}
      const lines: OrderLine[] = []
      for (const line of order.items ?? []) {
        let key = line.variant_id ?? GENERIC_ITEM
        if (!items[key]) {
          if (line.variant_id) {
            const [variant] = await loadVariants(container, { id: line.variant_id })
            items[key] = variant
              ? await upsertVariantItem(ctx, variant, false)
              : await namedItem(ctx, "Other items / منتجات أخرى", null)
          } else {
            key = GENERIC_ITEM
            items[key] = await namedItem(ctx, "Other items / منتجات أخرى", null)
          }
        }
        lines.push({
          variant_id: key,
          title: line.title,
          variant_title: line.variant_title,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          subtotal: Number(line.subtotal),
          addons: addonText(line.metadata),
        })
      }

      const shippingItemId = Number(order.shipping_total) > 0 ? await namedItem(ctx, "Delivery / التوصيل", "shipping_item_id") : ""
      const { payload, mismatch } = orderToSale(
        {
          id: order.id,
          display_id: order.display_id,
          created_at: order.created_at,
          currency_code: order.currency_code,
          email: order.email,
          lines,
          shipping_total: Number(order.shipping_total),
          discount_total: Number(order.discount_total),
          total: Number(order.total),
          provider_id: provider,
        },
        {
          items,
          shippingItemId,
          customerId: await customerId(ctx, order),
          paymentMethodId: paid ? await paymentMethodId(ctx, provider) : null,
          depositAccountId: paid ? ctx.connection.deposit_account_id : null,
          currency: ctx.connection.currency,
        },
        ctx.decimals
      )
      if (mismatch !== 0) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Lines add up to ${roundTo(Number(order.total) + mismatch, ctx.decimals)} but the order total is ${order.total}`)
      }
      const type = paid ? "SalesReceipt" : "Invoice"
      if (!paid) {
        delete (payload as Record<string, unknown>).DepositToAccountRef
      }
      const created = await ctx.client.create<{ Id: string; SyncToken?: string }>(type, payload, `order-${order.id}`.slice(0, 50))
      await recordSynced(ctx, "order", order.id, { type, id: created.Id!, syncToken: created.SyncToken })
      return created.Id
    } catch (error) {
      await recordFailed(container, "order", order.id, error)
      throw error
    }
  })
}

export async function syncRefundsToQuickBooks(container: MedusaContainer, paymentId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "payment",
    fields: [
      "id",
      "provider_id",
      "refunds.id",
      "refunds.amount",
      "refunds.created_at",
      "payment_collection.order.id",
      "payment_collection.order.display_id",
    ],
    filters: { id: paymentId },
  })
  const payment = data[0] as unknown as
    | {
        provider_id: string
        refunds?: { id: string; amount: number; created_at: string }[]
        payment_collection?: { order?: { id: string; display_id: number } | null } | null
      }
    | undefined
  const order = payment?.payment_collection?.order
  if (!payment || !order) return null

  return withQuickBooks(container, async (ctx) => {
    const orderRecord = await ctx.service.findRecord("order", order.id)
    if (!orderRecord?.qb_id) {
      // Book the sale first so the refund has something to offset.
      await syncOrderToQuickBooks(container, order.id)
    }
    const { data: orders } = await query.graph({ entity: "order", fields: ["customer_id", "email"], filters: { id: order.id } })
    const key = orders[0]?.customer_id ?? `email:${orders[0]?.email ?? order.id}`
    const customerRecord = await ctx.service.findRecord("customer", key)
    let count = 0
    for (const refund of payment.refunds ?? []) {
      const done = await ctx.service.findRecord("refund", refund.id)
      if (done?.status === "synced") continue
      try {
        if (!customerRecord?.qb_id) {
          throw new MedusaError(MedusaError.Types.INVALID_DATA, `Order ${order.id} is not in QuickBooks yet`)
        }
        const amount = roundTo(Number(refund.amount), ctx.decimals)
        const receipt = await ctx.client.create<{ Id: string }>(
          "RefundReceipt",
          {
            DocNumber: `LALY-${order.display_id}-R`.slice(0, 21),
            TxnDate: new Date(refund.created_at).toISOString().slice(0, 10),
            CustomerRef: { value: customerRecord?.qb_id },
            ...(ctx.connection.currency ? { CurrencyRef: { value: ctx.connection.currency } } : {}),
            ...(ctx.connection.deposit_account_id ? { DepositToAccountRef: { value: ctx.connection.deposit_account_id } } : {}),
            PaymentMethodRef: { value: await paymentMethodId(ctx, payment.provider_id) },
            PrivateNote: `Refund ${refund.id} for Laly order ${order.id}`,
            Line: [
              {
                DetailType: "SalesItemLineDetail",
                Amount: amount,
                Description: `Refund — order #${order.display_id}`,
                SalesItemLineDetail: {
                  ItemRef: { value: await namedItem(ctx, "Refunds / مرتجعات", "refund_item_id") },
                  Qty: 1,
                  UnitPrice: amount,
                },
              },
            ],
          },
          `refund-${refund.id}`.slice(0, 50)
        )
        await recordSynced(ctx, "refund", refund.id, { type: "RefundReceipt", id: receipt.Id })
        count++
      } catch (error) {
        await recordFailed(container, "refund", refund.id, error)
      }
    }
    return count
  })
}
