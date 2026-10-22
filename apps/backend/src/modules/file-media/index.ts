import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import MediaFileService from "./service"

export default ModuleProvider(Modules.FILE, { services: [MediaFileService] })
