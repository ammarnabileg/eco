import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { STORE_CONTENT_MODULE } from "../../modules/store-content"
import TrustBadge from "../../modules/store-content/models/trust-badge"
import StoreContentModuleService from "../../modules/store-content/service"
import { InferTypeOf } from "@medusajs/framework/types"

type TrustBadgeData = InferTypeOf<typeof TrustBadge>
type Editable = Omit<TrustBadgeData, "id" | "created_at" | "updated_at" | "deleted_at">
export type CreateTrustBadgeInput = Partial<Editable> & Pick<Editable, "icon" | "title_ar" | "title_en">
export type UpdateTrustBadgeInput = Partial<Editable> & { id: string }

const resolveService = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<StoreContentModuleService>(STORE_CONTENT_MODULE)

const insertTrustBadgeStep = createStep(
  "insert-trust-badge",
  async (input: CreateTrustBadgeInput, { container }) => {
    const row = await resolveService(container).createTrustBadges(input)
    return new StepResponse(row, row.id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).deleteTrustBadges([id])
    }
  }
)

const patchTrustBadgeStep = createStep(
  "patch-trust-badge",
  async (input: UpdateTrustBadgeInput, { container }) => {
    const service = resolveService(container)
    const previous = await service.retrieveTrustBadge(input.id)
    const row = await service.updateTrustBadges(input)
    return new StepResponse(row, previous)
  },
  async (previous, { container }) => {
    if (previous) {
      await resolveService(container).updateTrustBadges(previous)
    }
  }
)

const removeTrustBadgeStep = createStep(
  "remove-trust-badge",
  async (id: string, { container }) => {
    await resolveService(container).softDeleteTrustBadges([id])
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).restoreTrustBadges([id])
    }
  }
)

export const createTrustBadgeWorkflow = createWorkflow(
  "create-trust-badge",
  (input: CreateTrustBadgeInput) => new WorkflowResponse(insertTrustBadgeStep(input))
)

export const updateTrustBadgeWorkflow = createWorkflow(
  "update-trust-badge",
  (input: UpdateTrustBadgeInput) => new WorkflowResponse(patchTrustBadgeStep(input))
)

export const deleteTrustBadgeWorkflow = createWorkflow(
  "delete-trust-badge",
  (input: { id: string }) => new WorkflowResponse(removeTrustBadgeStep(input.id))
)
