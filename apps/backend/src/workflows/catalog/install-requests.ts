import { InferTypeOf } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { CATALOG_MODULE } from "../../modules/catalog"
import InstallRequest from "../../modules/catalog/models/install-request"
import CatalogModuleService from "../../modules/catalog/service"

type InstallData = InferTypeOf<typeof InstallRequest>

export type CreateInstallRequestInput = {
  customer_name: string
  phone: string
  governorate: string
  area?: string | null
  service: InstallData["service"]
  preferred_date?: string | null
  message?: string | null
  product_id?: string | null
  customer_id?: string | null
  locale?: string
}

export type UpdateInstallRequestInput = Partial<Pick<InstallData, "status" | "admin_note">> & { id: string }

export const INSTALL_REQUEST_CREATED = "install_request.created"

const resolveService = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<CatalogModuleService>(CATALOG_MODULE)

const insertInstallRequestStep = createStep(
  "insert-install-request",
  async (input: CreateInstallRequestInput, { container }) => {
    // A product reference must be a real, published product (requests can come from a product page).
    if (input.product_id) {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({ entity: "product", fields: ["id", "status"], filters: { id: input.product_id } })
      if (!data[0] || data[0].status !== "published") {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
      }
    }
    const row = await resolveService(container).createInstallRequests(input)
    return new StepResponse(row, row.id)
  },
  async (id, { container }) => {
    if (id) await resolveService(container).deleteInstallRequests([id])
  }
)

const patchInstallRequestStep = createStep(
  "patch-install-request",
  async (input: UpdateInstallRequestInput, { container }) => {
    const service = resolveService(container)
    const previous = await service.retrieveInstallRequest(input.id)
    const row = await service.updateInstallRequests(input)
    return new StepResponse(row, { id: previous.id, status: previous.status, admin_note: previous.admin_note })
  },
  async (previous, { container }) => {
    if (previous) await resolveService(container).updateInstallRequests(previous)
  }
)

export const createInstallRequestWorkflow = createWorkflow("create-install-request", (input: CreateInstallRequestInput) => {
  const row = insertInstallRequestStep(input)
  const event = transform({ row }, ({ row }) => ({ eventName: INSTALL_REQUEST_CREATED, data: { id: row.id } }))
  emitEventStep(event)
  return new WorkflowResponse(row)
})

export const updateInstallRequestWorkflow = createWorkflow("update-install-request", (input: UpdateInstallRequestInput) =>
  new WorkflowResponse(patchInstallRequestStep(input))
)
