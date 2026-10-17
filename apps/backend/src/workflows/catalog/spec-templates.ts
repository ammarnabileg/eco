import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
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
import { linkedIds, LinkSpec, replaceLinks } from "./steps/replace-links"

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

// previous is null when the categories were left untouched.
type SavedCategories = { id: string; previous: string[] | null }

const setTemplateCategoriesStep = createStep(
  "set-template-categories",
  async (input: { id: string; category_ids?: string[] }, { container }) => {
    if (!input.category_ids) {
      return new StepResponse<string[], SavedCategories>([], { id: input.id, previous: null })
    }
    const previous = await replaceLinks(container, categoriesOf(input.id), input.category_ids)
    // Categories that lost the template also need their products re-indexed.
    return new StepResponse<string[], SavedCategories>(previous, { id: input.id, previous })
  },
  async (saved, { container }) => {
    if (saved?.previous) {
      await replaceLinks(container, categoriesOf(saved.id), saved.previous)
    }
  }
)

// Facets and spec text come from the template, so re-index every product in
// the categories it applies to (and the ones it just left).
const reindexTemplateProductsStep = createStep(
  "reindex-template-products",
  async (input: { id: string; extra_category_ids: string[] }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const current = await linkedIds(container, categoriesOf(input.id))
    const categoryIds = [...new Set([...current, ...input.extra_category_ids])]
    if (!categoryIds.length) {
      return new StepResponse(0)
    }
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["products.id"],
      filters: { id: categoryIds },
    })
    const productIds = [
      ...new Set(data.flatMap((c) => (c.products ?? []).map((p) => p?.id).filter(Boolean) as string[])),
    ]
    if (!productIds.length) {
      return new StepResponse(0)
    }
    try {
      await container.resolve(Modules.SEARCH).ingest({
        name: "product.updated",
        data: productIds.map((id) => ({ id })),
      })
    } catch (error) {
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(`Search re-index after template change skipped: ${(error as Error).message}`)
    }
    return new StepResponse(productIds.length)
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
    reindexTemplateProductsStep(transform({ row }, ({ row }) => ({ id: row.id, extra_category_ids: [] })))
    return new WorkflowResponse(row)
  }
)

export const updateSpecTemplateWorkflow = createWorkflow(
  "update-spec-template",
  (input: UpdateSpecTemplateInput) => {
    const row = patchSpecTemplateStep(input)
    const previous = setTemplateCategoriesStep(input)
    reindexTemplateProductsStep(
      transform({ input, previous }, ({ input, previous }) => ({
        id: input.id,
        extra_category_ids: previous,
      }))
    )
    return new WorkflowResponse(row)
  }
)

export const deleteSpecTemplateWorkflow = createWorkflow(
  "delete-spec-template",
  (input: { id: string }) => {
    const links = transform({ input }, ({ input }) => ({ id: input.id, category_ids: [] as string[] }))
    const previous = setTemplateCategoriesStep(links)
    const removed = removeSpecTemplateStep(input.id)
    reindexTemplateProductsStep(
      transform({ input, previous }, ({ input, previous }) => ({
        id: input.id,
        extra_category_ids: previous,
      }))
    )
    return new WorkflowResponse(removed)
  }
)
