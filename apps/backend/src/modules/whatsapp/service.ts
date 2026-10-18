import { MedusaService } from "@medusajs/framework/utils"

import WaCartReminder from "./models/wa-cart-reminder"
import WaOrderConfirmation from "./models/wa-order-confirmation"
import WaOtp from "./models/wa-otp"

class WhatsAppModuleService extends MedusaService({ WaOtp, WaOrderConfirmation, WaCartReminder }) {}

export default WhatsAppModuleService
