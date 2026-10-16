import type { McpServer } from "@modelcontextprotocol/server"
import * as z from "zod/v4"

import { api, kwd } from "../api.js"
import { respond } from "../respond.js"

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
const format = z.enum(["markdown", "json"]).default("markdown").describe("'markdown' to read, 'json' for structured data")

type Order = {
  id: string
  display_id: number
  status: string
  payment_status: string
  fulfillment_status: string
  email: string | null
  total: number
  currency_code: string
  created_at: string
  items?: { title: string; quantity: number; unit_price: number }[]
  shipping_address?: { first_name?: string; last_name?: string; city?: string; province?: string; phone?: string } | null
}

const ORDER_FIELDS =
  "id,display_id,status,payment_status,fulfillment_status,email,total,currency_code,created_at,*items,*shipping_address"

// Read-only: the assistant can look up orders but cannot refund, cancel, or edit them.
export function registerOrderTools(server: McpServer) {
  server.registerTool(
    "laly_list_orders",
    {
      title: "List orders",
      description:
        "List recent orders, newest first, with number, customer email, total in KWD, payment and fulfillment status. Read-only. Use laly_get_order for items and address.",
      inputSchema: z.strictObject({
        limit: z.number().int().min(1).max(50).default(15),
        offset: z.number().int().min(0).default(0),
        response_format: format,
      }),
      annotations: READ,
    },
    async ({ limit, offset, response_format }, ctx) => {
      const { orders, count } = await api<{ orders: Order[]; count: number }>("/admin/orders", {
        query: { limit, offset, order: "-created_at", fields: ORDER_FIELDS },
        signal: ctx.mcpReq.signal,
      })
      const next = offset + orders.length
      return respond({ total: count, offset, orders, has_more: count > next }, response_format, () =>
        orders.length
          ? [
              `# Orders (${orders.length} of ${count})`,
              ...orders.map(
                (o) =>
                  `- #${o.display_id} (${o.id}) — ${new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" })} — ${o.email ?? "guest"} — ${kwd(o.total)} — payment: ${o.payment_status}, fulfillment: ${o.fulfillment_status}`
              ),
              ...(count > next ? ["", `More: call again with offset=${next}.`] : []),
            ].join("\n")
          : "No orders yet."
      )
    }
  )

  server.registerTool(
    "laly_get_order",
    {
      title: "Get order",
      description: "Get one order's items, totals, statuses and delivery address. Read-only.",
      inputSchema: z.strictObject({
        id: z.string().startsWith("order_").describe("Order id from laly_list_orders"),
        response_format: format,
      }),
      annotations: READ,
    },
    async ({ id, response_format }, ctx) => {
      const { order } = await api<{ order: Order }>(`/admin/orders/${id}`, {
        query: { fields: ORDER_FIELDS },
        signal: ctx.mcpReq.signal,
      })
      const a = order.shipping_address
      return respond({ order }, response_format, () =>
        [
          `# Order #${order.display_id}`,
          `- Placed: ${new Date(order.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" })}`,
          `- Customer: ${order.email ?? "guest"}`,
          `- Payment: ${order.payment_status} · Fulfillment: ${order.fulfillment_status}`,
          `- Total: ${kwd(order.total)}`,
          a ? `- Deliver to: ${[a.first_name, a.last_name].filter(Boolean).join(" ")}, ${a.city ?? ""}, ${a.province ?? ""} · ${a.phone ?? ""}` : "",
          "",
          "## Items",
          ...(order.items ?? []).map((i) => `- ${i.quantity} × ${i.title} @ ${kwd(i.unit_price)}`),
        ].join("\n")
      )
    }
  )
}
