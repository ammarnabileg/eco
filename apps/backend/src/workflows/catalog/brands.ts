import { InferTypeOf } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { CATALOG_MODULE } from "../../modules/catalog"
import Brand from "../../modules/catalog/models/brand"
import CatalogModuleService from "../../modules/catalog/service"

type BrandData = InferTypeOf<typeof Brand>
type Editable = Omit<BrandData, "id" | "created_at" | "updated_at" | "deleted_at">
export type CreateBrandInput = Partial<Editable> & Pick<Editable, "name" | "handle">
export type UpdateBrandInput = Partial<Editable> & { id: string }

const resolveService = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<CatalogModuleService>(CATALOG_MODULE)

const insertBrandStep = createStep(
  "insert-brand",
  async (input: CreateBrandInput, { container }) => {
    const row = await resolveService(container).createBrands(input)
    return new StepResponse(row, row.id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).deleteBrands([id])
    }
  }
)

const patchBrandStep = createStep(
  "patch-brand",
  async (input: UpdateBrandInput, { container }) => {
    const service = resolveService(container)
    const previous = await service.retrieveBrand(input.id)
    const row = await service.updateBrands(input)
    return new StepResponse(row, previous)
  },
  async (previous, { container }) => {
    if (previous) {
      await resolveService(container).updateBrands(previous)
    }
  }
)

const removeBrandStep = createStep(
  "remove-brand",
  async (id: string, { container }) => {
    await resolveService(container).softDeleteBrands([id])
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).restoreBrands([id])
    }
  }
)

export const createBrandWorkflow = createWorkflow(
  "create-brand",
  (input: CreateBrandInput) => new WorkflowResponse(insertBrandStep(input))
)

export const updateBrandWorkflow = createWorkflow(
  "update-brand",
  (input: UpdateBrandInput) => new WorkflowResponse(patchBrandStep(input))
)

export const deleteBrandWorkflow = createWorkflow(
  "delete-brand",
  (input: { id: string }) => new WorkflowResponse(removeBrandStep(input.id))
)
