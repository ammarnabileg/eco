import { MedusaService } from "@medusajs/framework/utils"

import WaCartReminder from "./models/wa-cart-reminder"
import WaConversation from "./models/wa-conversation"
import WaMessage from "./models/wa-message"
import WaNumber from "./models/wa-number"
import WaOrderConfirmation from "./models/wa-order-confirmation"
import WaOtp from "./models/wa-otp"

class WhatsAppModuleService extends MedusaService({
  WaOtp,
  WaOrderConfirmation,
  WaCartReminder,
  WaNumber,
  WaConversation,
  WaMessage,
}) {}

export default WhatsAppModuleService
