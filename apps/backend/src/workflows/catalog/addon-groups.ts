import { InferTypeOf } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { CATALOG_MODULE } from "../../modules/catalog"
import AddonGroup from "../../modules/catalog/models/addon-group"
import CatalogModuleService from "../../modules/catalog/service"

type GroupData = InferTypeOf<typeof AddonGroup>

export type AddonOptionInput = {
  id?: string
  name_ar: string
  name_en: string
  price: number
  sku?: string | null
  is_active?: boolean
  rank?: number
}

export type AddonGroupInput = Partial<
  Pick<GroupData, "kind" | "selection" | "is_required" | "rank">
> & {
  name_ar: string
  name_en: string
  options?: AddonOptionInput[]
}
export type UpdateAddonGroupInput = Partial<AddonGroupInput> & { id: string }

type OptionRow = AddonOptionInput & { id: string }

const resolveService = (container: { resolve: <T>(key: string) => T }) =>
  container.resolve<CatalogModuleService>(CATALOG_MODULE)

async function loadGroup(service: CatalogModuleService, id: string) {
  return service.retrieveAddonGroup(id, { relations: ["options"] })
}

// Brings the group's options in line with `options`: rows with an id are
// updated, rows without one are created, and missing rows are deleted.
async function syncOptions(service: CatalogModuleService, groupId: string, options: AddonOptionInput[]) {
  const existing = await service.listAddonOptions({ group_id: groupId })
  const keep = new Set(options.filter((o) => o.id).map((o) => o.id))
  const stale = existing.filter((o) => !keep.has(o.id)).map((o) => o.id)
  if (stale.length) {
    await service.deleteAddonOptions(stale)
  }
  const updates = options.filter((o): o is OptionRow => Boolean(o.id))
  if (updates.length) {
    await service.updateAddonOptions(updates)
  }
  const creates = options.filter((o) => !o.id).map((o) => ({ ...o, group_id: groupId }))
  if (creates.length) {
    await service.createAddonOptions(creates)
  }
}

const snapshot = (group: Awaited<ReturnType<typeof loadGroup>>) => ({
  id: group.id,
  name_ar: group.name_ar,
  name_en: group.name_en,
  kind: group.kind,
  selection: group.selection,
  is_required: group.is_required,
  rank: group.rank,
  options: (group.options ?? []).map((o) => ({
    name_ar: o.name_ar,
    name_en: o.name_en,
    price: Number(o.price),
    sku: o.sku,
    is_active: o.is_active,
    rank: o.rank,
  })),
})

const insertAddonGroupStep = createStep(
  "insert-addon-group",
  async (input: AddonGroupInput, { container }) => {
    const service = resolveService(container)
    const { options, ...data } = input
    const group = await service.createAddonGroups(data)
    try {
      await syncOptions(service, group.id, options ?? [])
    } catch (error) {
      // A failing step is not compensated, so undo the half-done create here.
      await service.deleteAddonGroups([group.id])
      throw error
    }
    return new StepResponse(await loadGroup(service, group.id), group.id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).deleteAddonGroups([id])
    }
  }
)

const patchAddonGroupStep = createStep(
  "patch-addon-group",
  async (input: UpdateAddonGroupInput, { container }) => {
    const service = resolveService(container)
    const previous = snapshot(await loadGroup(service, input.id))
    const { options, ...data } = input
    await service.updateAddonGroups(data)
    if (options) {
      await syncOptions(service, input.id, options)
    }
    return new StepResponse(await loadGroup(service, input.id), previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service = resolveService(container)
    const { options, ...data } = previous
    await service.updateAddonGroups(data)
    await syncOptions(service, previous.id, options)
  }
)

const removeAddonGroupStep = createStep(
  "remove-addon-group",
  async (id: string, { container }) => {
    await resolveService(container).softDeleteAddonGroups([id])
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) {
      await resolveService(container).restoreAddonGroups([id])
    }
  }
)

export const createAddonGroupWorkflow = createWorkflow(
  "create-addon-group",
  (input: AddonGroupInput) => new WorkflowResponse(insertAddonGroupStep(input))
)

export const updateAddonGroupWorkflow = createWorkflow(
  "update-addon-group",
  (input: UpdateAddonGroupInput) => new WorkflowResponse(patchAddonGroupStep(input))
)

export const deleteAddonGroupWorkflow = createWorkflow(
  "delete-addon-group",
  (input: { id: string }) => new WorkflowResponse(removeAddonGroupStep(input.id))
)
