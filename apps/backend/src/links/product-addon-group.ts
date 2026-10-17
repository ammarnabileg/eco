import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import CatalogModule from "../modules/catalog"

// Which optional-part groups (RAM, SSD, HDD...) a product offers.
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  { linkable: CatalogModule.linkable.addonGroup, isList: true }
)
