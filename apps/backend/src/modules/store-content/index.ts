import { Module } from "@medusajs/framework/utils"

import StoreContentModuleService from "./service"

export const STORE_CONTENT_MODULE = "store_content"

export default Module(STORE_CONTENT_MODULE, {
  service: StoreContentModuleService,
})
