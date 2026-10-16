import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { STORE_CONTENT_MODULE } from "../../modules/store-content"
import HeroSlide from "../../modules/store-content/models/hero-slide"
import StoreContentModuleService from "../../modules/store-content/service"
import { InferTypeOf } from "@medusajs/framework/types"

type HeroSlideData = InferTypeOf<typeof HeroSlide>
type Editable = Omit<HeroSlideData, "id" | "created_at" | "updated_at" | "deleted_at">
export type CreateHeroSlideInput = Partial<Editable> & Pick<Editable, "title_ar" | "title_en">
export type UpdateHeroSlideInput = Partial<Editable> & { id: string }

const resolveService = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<StoreContentModuleService>(STORE_CONTENT_MODULE)

const insertHeroSlideStep = createStep(
  "insert-hero-slide",
  async (input: CreateHeroSlideInput, { container }) => {
    const row = await resolveService(container).createHeroSlides(input)
    return new StepResponse(row, row.id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).deleteHeroSlides([id])
    }
  }
)

const patchHeroSlideStep = createStep(
  "patch-hero-slide",
  async (input: UpdateHeroSlideInput, { container }) => {
    const service = resolveService(container)
    const previous = await service.retrieveHeroSlide(input.id)
    const row = await service.updateHeroSlides(input)
    return new StepResponse(row, previous)
  },
  async (previous, { container }) => {
    if (previous) {
      await resolveService(container).updateHeroSlides(previous)
    }
  }
)

const removeHeroSlideStep = createStep(
  "remove-hero-slide",
  async (id: string, { container }) => {
    await resolveService(container).softDeleteHeroSlides([id])
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).restoreHeroSlides([id])
    }
  }
)

export const createHeroSlideWorkflow = createWorkflow(
  "create-hero-slide",
  (input: CreateHeroSlideInput) => new WorkflowResponse(insertHeroSlideStep(input))
)

export const updateHeroSlideWorkflow = createWorkflow(
  "update-hero-slide",
  (input: UpdateHeroSlideInput) => new WorkflowResponse(patchHeroSlideStep(input))
)

export const deleteHeroSlideWorkflow = createWorkflow(
  "delete-hero-slide",
  (input: { id: string }) => new WorkflowResponse(removeHeroSlideStep(input.id))
)
