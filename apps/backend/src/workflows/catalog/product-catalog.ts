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
import { FaqEntry, validateSpecs } from "../../modules/catalog/specs"
import { productAttributes } from "./steps/product-attributes"
import { linkedIds, LinkSpec, replaceLinks } from "./steps/replace-links"

export type ProductDetailInput = {
  title_en?: string | null
  subtitle_ar?: string | null
  subtitle_en?: string | null
  description_en?: string | null
  highlights_ar?: string[] | null
  highlights_en?: string[] | null
  specs?: Record<string, unknown> | null
  faq?: FaqEntry[] | null
  seo_title_ar?: string | null
  seo_title_en?: string | null
  seo_description_ar?: string | null
  seo_description_en?: string | null
  mpn?: string | null
  series?: string | null
  price_on_request?: boolean
  warranty_months?: number | null
  source_url?: string | null
}

export type ProductCatalogInput = {
  product_id: string
  detail?: ProductDetailInput
  /** null removes the brand; undefined leaves it as is. */
  brand_id?: string | null
  addon_group_ids?: string[]
}

const resolveService = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<CatalogModuleService>(CATALOG_MODULE)

const productLink = (productId: string, field: string, module: string, key: string): LinkSpec => ({
  entity: "product",
  field,
  from: { module: Modules.PRODUCT, key: "product_id", id: productId },
  to: { module, key },
})

const detailLink = (productId: string) =>
  productLink(productId, "product_detail", CATALOG_MODULE, "product_detail_id")

const checkProductSpecsStep = createStep(
  "check-product-specs",
  async (input: ProductCatalogInput, { container }) => {
    const raw = input.detail?.specs
    if (raw === undefined || raw === null) {
      return new StepResponse(raw)
    }
    const attributes = await productAttributes(container, input.product_id)
    const { specs, errors } = validateSpecs(attributes, raw)
    if (errors.length) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errors.join("; "))
    }
    return new StepResponse(specs)
  }
)

type DetailRow = Awaited<ReturnType<CatalogModuleService["retrieveProductDetail"]>>
type SavedDetail = { previous?: DetailRow; created?: string }

const saveProductDetailStep = createStep(
  "save-product-detail",
  async (input: { product_id: string; detail?: Record<string, unknown> }, { container }) => {
    if (!input.detail) {
      return new StepResponse<DetailRow | undefined, SavedDetail | undefined>(undefined, undefined)
    }
    const service = resolveService(container)
    const [existingId] = await linkedIds(container, detailLink(input.product_id))
    if (existingId) {
      const previous = await service.retrieveProductDetail(existingId)
      const row = await service.updateProductDetails({ ...input.detail, id: existingId })
      return new StepResponse<DetailRow | undefined, SavedDetail | undefined>(row, { previous })
    }
    const row = await service.createProductDetails(input.detail)
    try {
      await replaceLinks(container, detailLink(input.product_id), [row.id])
    } catch (error) {
      // A failing step is not compensated, so undo the half-done create here.
      await service.deleteProductDetails([row.id])
      throw error
    }
    return new StepResponse<DetailRow | undefined, SavedDetail | undefined>(row, { created: row.id })
  },
  async (saved, { container }) => {
    if (!saved) {
      return
    }
    const service = resolveService(container)
    if (saved.previous) {
      await service.updateProductDetails(saved.previous)
    }
    if (saved.created) {
      await service.deleteProductDetails([saved.created])
    }
  }
)

const setProductBrandStep = createStep(
  "set-product-brand",
  async (input: { product_id: string; brand_id?: string | null }, { container }) => {
    if (input.brand_id === undefined) {
      return new StepResponse(undefined, undefined)
    }
    const spec = productLink(input.product_id, "brand", CATALOG_MODULE, "brand_id")
    const previous = await replaceLinks(container, spec, input.brand_id ? [input.brand_id] : [])
    return new StepResponse(input.brand_id, { product_id: input.product_id, previous })
  },
  async (saved, { container }) => {
    if (saved) {
      const spec = productLink(saved.product_id, "brand", CATALOG_MODULE, "brand_id")
      await replaceLinks(container, spec, saved.previous)
    }
  }
)

const setProductAddonGroupsStep = createStep(
  "set-product-addon-groups",
  async (input: { product_id: string; addon_group_ids?: string[] }, { container }) => {
    if (!input.addon_group_ids) {
      return new StepResponse(undefined, undefined)
    }
    const spec = productLink(input.product_id, "addon_groups", CATALOG_MODULE, "addon_group_id")
    const previous = await replaceLinks(container, spec, input.addon_group_ids)
    return new StepResponse(input.addon_group_ids, { product_id: input.product_id, previous })
  },
  async (saved, { container }) => {
    if (saved) {
      const spec = productLink(saved.product_id, "addon_groups", CATALOG_MODULE, "addon_group_id")
      await replaceLinks(container, spec, saved.previous)
    }
  }
)

// Brand, specs and English copy are part of the search document, and none of
// them emit a product event, so re-index explicitly. A search outage must not
// undo a saved product, so failures are logged and the next full sync fixes it.
export const reindexProductsStep = createStep(
  "reindex-products",
  async (productIds: string[], { container }) => {
    try {
      await container.resolve(Modules.SEARCH).ingest({
        name: "product.updated",
        data: productIds.map((id) => ({ id })),
      })
    } catch (error) {
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(`Search re-index skipped for ${productIds.join(", ")}: ${(error as Error).message}`)
    }
    return new StepResponse(productIds)
  }
)

export const updateProductCatalogWorkflow = createWorkflow(
  "update-product-catalog",
  (input: ProductCatalogInput) => {
    const specs = checkProductSpecsStep(input)
    const detailInput = transform({ input, specs }, ({ input, specs }) => ({
      product_id: input.product_id,
      detail: input.detail
        ? { ...input.detail, ...(specs !== undefined ? { specs } : {}) }
        : undefined,
    }))
    const detail = saveProductDetailStep(detailInput)
    const brandInput = transform({ input }, ({ input }) => ({
      product_id: input.product_id,
      brand_id: input.brand_id,
    }))
    setProductBrandStep(brandInput)
    const addonInput = transform({ input }, ({ input }) => ({
      product_id: input.product_id,
      addon_group_ids: input.addon_group_ids,
    }))
    setProductAddonGroupsStep(addonInput)
    const ids = transform({ input }, ({ input }) => [input.product_id])
    reindexProductsStep(ids)
    return new WorkflowResponse(detail)
  }
)
