import { MedusaService } from "@medusajs/framework/utils"

import WaOrderConfirmation from "./models/wa-order-confirmation"
import WaOtp from "./models/wa-otp"

class WhatsAppModuleService extends MedusaService({ WaOtp, WaOrderConfirmation }) {}

export default WhatsAppModuleService
