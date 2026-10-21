import { MedusaService } from "@medusajs/framework/utils"

import AiUsage from "./models/ai-usage"

class AiModuleService extends MedusaService({ AiUsage }) {}

export default AiModuleService
