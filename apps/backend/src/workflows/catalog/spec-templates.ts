import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { CATALOG_MODULE } from "../../modules/catalog"
import CatalogModuleService from "../../modules/catalog/service"
import { SpecAttribute, templateErrors } from "../../modules/catalog/specs"
import { LinkSpec, replaceLinks } from "./steps/replace-links"

export type SpecTemplateInput = {
  name_ar: string
  name_en: string
  attributes: SpecAttribute[]
  rank?: number
  category_ids?: string[]
}
export type UpdateSpecTemplateInput = Partial<SpecTemplateInput> & { id: string }

const resolveService = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<CatalogModuleService>(CATALOG_MODULE)

const categoriesOf = (id: string): LinkSpec => ({
  entity: "spec_template",
  field: "product_categories",
  from: { module: CATALOG_MODULE, key: "spec_template_id", id },
  to: { module: Modules.PRODUCT, key: "product_category_id" },
  reversed: true,
})

// The data model types JSON columns as objects; the template stores an array.
const asJson = (attributes: SpecAttribute[]) => attributes as unknown as Record<string, unknown>

const assertValid = (attributes?: SpecAttribute[]) => {
  const errors = attributes ? templateErrors(attributes) : []
  if (errors.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, errors.join("; "))
  }
}

const insertSpecTemplateStep = createStep(
  "insert-spec-template",
  async (input: Omit<SpecTemplateInput, "category_ids">, { container }) => {
    assertValid(input.attributes)
    const row = await resolveService(container).createSpecTemplates({
      name_ar: input.name_ar,
      name_en: input.name_en,
      rank: input.rank,
      attributes: asJson(input.attributes),
    })
    return new StepResponse(row, row.id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).deleteSpecTemplates([id])
    }
  }
)

const patchSpecTemplateStep = createStep(
  "patch-spec-template",
  async (input: Omit<UpdateSpecTemplateInput, "category_ids">, { container }) => {
    assertValid(input.attributes)
    const service = resolveService(container)
    const { attributes, ...data } = input
    const previous = await service.retrieveSpecTemplate(input.id)
    const row = await service.updateSpecTemplates({
      ...data,
      ...(attributes ? { attributes: asJson(attributes) } : {}),
    })
    return new StepResponse(row, previous)
  },
  async (previous, { container }) => {
    if (previous) {
      await resolveService(container).updateSpecTemplates(previous)
    }
  }
)

const setTemplateCategoriesStep = createStep(
  "set-template-categories",
  async (input: { id: string; category_ids?: string[] }, { container }) => {
    if (!input.category_ids) {
      return new StepResponse(undefined, undefined)
    }
    const previous = await replaceLinks(container, categoriesOf(input.id), input.category_ids)
    return new StepResponse(input.category_ids, { id: input.id, previous })
  },
  async (saved, { container }) => {
    if (saved) {
      await replaceLinks(container, categoriesOf(saved.id), saved.previous)
    }
  }
)

const removeSpecTemplateStep = createStep(
  "remove-spec-template",
  async (id: string, { container }) => {
    await resolveService(container).softDeleteSpecTemplates([id])
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).restoreSpecTemplates([id])
    }
  }
)

export const createSpecTemplateWorkflow = createWorkflow(
  "create-spec-template",
  (input: SpecTemplateInput) => {
    const row = insertSpecTemplateStep(input)
    const links = transform({ row, input }, ({ row, input }) => ({
      id: row.id,
      category_ids: input.category_ids,
    }))
    setTemplateCategoriesStep(links)
    return new WorkflowResponse(row)
  }
)

export const updateSpecTemplateWorkflow = createWorkflow(
  "update-spec-template",
  (input: UpdateSpecTemplateInput) => {
    const row = patchSpecTemplateStep(input)
    setTemplateCategoriesStep(input)
    return new WorkflowResponse(row)
  }
)

export const deleteSpecTemplateWorkflow = createWorkflow(
  "delete-spec-template",
  (input: { id: string }) => {
    const links = transform({ input }, ({ input }) => ({ id: input.id, category_ids: [] as string[] }))
    setTemplateCategoriesStep(links)
    return new WorkflowResponse(removeSpecTemplateStep(input.id))
  }
)
