import { Module } from "@medusajs/framework/utils"

import WhatsAppModuleService from "./service"

export const WHATSAPP_MODULE = "whatsapp"

export default Module(WHATSAPP_MODULE, {
  service: WhatsAppModuleService,
})
