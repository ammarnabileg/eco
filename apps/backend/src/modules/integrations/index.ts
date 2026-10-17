import { Module } from "@medusajs/framework/utils"

import IntegrationsModuleService from "./service"

export const INTEGRATIONS_MODULE = "integrations"

export default Module(INTEGRATIONS_MODULE, {
  service: IntegrationsModuleService,
})
