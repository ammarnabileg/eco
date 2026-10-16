import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import MeilisearchSearchService from "./service"

export default ModuleProvider(Modules.SEARCH, {
  services: [MeilisearchSearchService],
})
