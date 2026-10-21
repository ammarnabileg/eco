import { MedusaService } from "@medusajs/framework/utils"

import AiBanner from "./models/ai-banner"
import AiUsage from "./models/ai-usage"

class AiModuleService extends MedusaService({ AiUsage, AiBanner }) {}

export default AiModuleService
