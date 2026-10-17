import { InferTypeOf } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { CATALOG_MODULE } from "../../modules/catalog"
import QuoteRequest from "../../modules/catalog/models/quote-request"
import CatalogModuleService from "../../modules/catalog/service"

type QuoteData = InferTypeOf<typeof QuoteRequest>

export type CreateQuoteRequestInput = {
  product_id: string
  variant_id?: string | null
  customer_name: string
  phone: string
  email?: string | null
  company?: string | null
  quantity?: number
  message?: string | null
  customer_id?: string | null
  locale?: string
}

export type UpdateQuoteRequestInput = Partial<Pick<QuoteData, "status" | "admin_note">> & {
  id: string
}

export const QUOTE_REQUEST_CREATED = "quote_request.created"

const resolveService = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<CatalogModuleService>(CATALOG_MODULE)

const insertQuoteRequestStep = createStep(
  "insert-quote-request",
  async (input: CreateQuoteRequestInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "status", "variants.id"],
      filters: { id: input.product_id },
    })
    const product = data[0]
    if (!product || product.status !== "published") {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
    }
    if (input.variant_id && !product.variants?.some((v) => v?.id === input.variant_id)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Variant does not belong to the product")
    }
    // The title is copied so the request stays readable if the product changes.
    const row = await resolveService(container).createQuoteRequests({
      ...input,
      product_title: product.title,
    })
    return new StepResponse(row, row.id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).deleteQuoteRequests([id])
    }
  }
)

const patchQuoteRequestStep = createStep(
  "patch-quote-request",
  async (input: UpdateQuoteRequestInput, { container }) => {
    const service = resolveService(container)
    const previous = await service.retrieveQuoteRequest(input.id)
    const row = await service.updateQuoteRequests(input)
    return new StepResponse(row, { id: previous.id, status: previous.status, admin_note: previous.admin_note })
  },
  async (previous, { container }) => {
    if (previous) {
      await resolveService(container).updateQuoteRequests(previous)
    }
  }
)

export const createQuoteRequestWorkflow = createWorkflow(
  "create-quote-request",
  (input: CreateQuoteRequestInput) => {
    const row = insertQuoteRequestStep(input)
    const event = transform({ row }, ({ row }) => ({
      eventName: QUOTE_REQUEST_CREATED,
      data: { id: row.id },
    }))
    emitEventStep(event)
    return new WorkflowResponse(row)
  }
)

export const updateQuoteRequestWorkflow = createWorkflow(
  "update-quote-request",
  (input: UpdateQuoteRequestInput) => new WorkflowResponse(patchQuoteRequestStep(input))
)
