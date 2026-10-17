import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import TalyProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [TalyProviderService],
})
