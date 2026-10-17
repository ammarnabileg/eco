import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import DeemaProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [DeemaProviderService],
})
