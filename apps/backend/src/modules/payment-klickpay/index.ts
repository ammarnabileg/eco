import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import KlickPayProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [KlickPayProviderService],
})
