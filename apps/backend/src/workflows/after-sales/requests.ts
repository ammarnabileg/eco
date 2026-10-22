import { InferTypeOf, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { AFTER_SALES_MODULE } from "../../modules/after-sales"
import AfterSalesRequest from "../../modules/after-sales/models/after-sales-request"
import AfterSalesModuleService from "../../modules/after-sales/service"
import { normalizePhone } from "../../modules/whatsapp/messages"

// Return, exchange and warranty requests. A request is only a message to
// staff: it never creates a Medusa return, an exchange or a refund. Staff
// review it, talk to the customer and decide.

type RequestData = InferTypeOf<typeof AfterSalesRequest>

export const AFTER_SALES_REQUEST_CREATED = "after_sales_request.created"

export type CreateAfterSalesRequestInput = {
  order_id: string
  kind: RequestData["kind"]
  reason: RequestData["reason"]
  details?: string | null
  phone?: string | null
  items: { line_item_id: string; quantity: number }[]
  customer_id?: string | null
  locale?: string
}

export type UpdateAfterSalesRequestInput = Partial<Pick<RequestData, "status" | "admin_note">> & { id: string }

const service = (c: MedusaContainer) => c.resolve<AfterSalesModuleService>(AFTER_SALES_MODULE)

type OrderForRequest = {
  id: string
  display_id: number
  status: string
  customer_id?: string | null
  items?: { id: string; title: string; product_title?: string | null; variant_title?: string | null; quantity: number }[]
  shipping_address?: { phone?: string | null } | null
  customer?: { phone?: string | null } | null
}

type PreparedRequest = {
  kind: RequestData["kind"]
  order_id: string
  order_display_id: number
  customer_id: string | null
  items: { line_item_id: string; title: string; quantity: number }[]
  reason: RequestData["reason"]
  details: string | null
  phone: string
  locale: string
}

/** Checks the items against the order and builds the row; staff see titles as they were ordered. */
const prepareAfterSalesRequestStep = createStep(
  "prepare-after-sales-request",
  async (input: CreateAfterSalesRequestInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "status", "customer_id", "items.*", "shipping_address.phone", "customer.phone"],
      filters: { id: input.order_id },
    })
    const order = data[0] as unknown as OrderForRequest | undefined
    if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
    if (order.status === "canceled" || order.status === "draft") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This order cannot have after-sales requests")
    }
    const lines = new Map((order.items ?? []).map((i) => [i.id, i]))
    const wanted = new Map<string, number>()
    for (const item of input.items) wanted.set(item.line_item_id, (wanted.get(item.line_item_id) ?? 0) + item.quantity)
    if (!wanted.size) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Choose at least one item")
    const items = [...wanted].map(([id, quantity]) => {
      const line = lines.get(id)
      if (!line) throw new MedusaError(MedusaError.Types.INVALID_DATA, "An item is not part of this order")
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > Number(line.quantity)) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Quantity for "${line.title}" must be between 1 and ${line.quantity}`)
      }
      const title = [line.product_title || line.title, line.variant_title].filter(Boolean).join(" - ")
      return { line_item_id: id, title, quantity }
    })
    const phone = input.phone?.trim() || order.shipping_address?.phone || order.customer?.phone || ""
    if (!normalizePhone(phone)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enter a valid phone number")
    const prepared: PreparedRequest = {
      kind: input.kind,
      order_id: order.id,
      order_display_id: Number(order.display_id),
      customer_id: input.customer_id ?? null,
      items,
      reason: input.reason,
      details: input.details?.trim() || null,
      phone: phone.trim(),
      locale: input.locale ?? "ar",
    }
    return new StepResponse(prepared)
  }
)

const insertAfterSalesRequestStep = createStep(
  "insert-after-sales-request",
  async (input: PreparedRequest, { container }) => {
    const row = await service(container).createAfterSalesRequests({ ...input, items: input.items as unknown as Record<string, unknown> })
    return new StepResponse(row, row.id)
  },
  async (id, { container }) => {
    if (id) await service(container).deleteAfterSalesRequests([id])
  }
)

const patchAfterSalesRequestStep = createStep(
  "patch-after-sales-request",
  async (input: UpdateAfterSalesRequestInput, { container }) => {
    const svc = service(container)
    const previous = await svc.retrieveAfterSalesRequest(input.id)
    const row = await svc.updateAfterSalesRequests(input)
    return new StepResponse(row, { id: previous.id, status: previous.status, admin_note: previous.admin_note })
  },
  async (previous, { container }) => {
    if (previous) await service(container).updateAfterSalesRequests(previous)
  }
)

export const createAfterSalesRequestWorkflow = createWorkflow(
  "create-after-sales-request",
  (input: CreateAfterSalesRequestInput) => {
    const prepared = prepareAfterSalesRequestStep(input)
    const row = insertAfterSalesRequestStep(prepared)
    const event = transform({ row }, ({ row }) => ({ eventName: AFTER_SALES_REQUEST_CREATED, data: { id: row.id } }))
    emitEventStep(event)
    return new WorkflowResponse(row)
  }
)

export const updateAfterSalesRequestWorkflow = createWorkflow(
  "update-after-sales-request",
  (input: UpdateAfterSalesRequestInput) => new WorkflowResponse(patchAfterSalesRequestStep(input))
)
