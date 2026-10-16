import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { STORE_CONTENT_MODULE } from "../../modules/store-content"
import StoreContentModuleService from "../../modules/store-content/service"

export type UpdateSiteSettingsInput = {
  whatsapp?: string | null
  phone?: string | null
  email?: string | null
  address_ar?: string | null
  address_en?: string | null
  hours_ar?: string | null
  hours_en?: string | null
}

const saveSiteSettingsStep = createStep(
  "save-site-settings",
  async (input: UpdateSiteSettingsInput, { container }) => {
    const service: StoreContentModuleService =
      container.resolve(STORE_CONTENT_MODULE)
    const previous = await service.getSettings()
    const updated = await service.updateSiteSettings({ id: previous.id, ...input })
    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (previous) {
      const service: StoreContentModuleService =
        container.resolve(STORE_CONTENT_MODULE)
      await service.updateSiteSettings(previous)
    }
  }
)

export const updateSiteSettingsWorkflow = createWorkflow(
  "update-site-settings",
  (input: UpdateSiteSettingsInput) =>
    new WorkflowResponse(saveSiteSettingsStep(input))
)
