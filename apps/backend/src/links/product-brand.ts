import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import CatalogModule from "../modules/catalog"

// A brand has many products; a product has one brand.
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  CatalogModule.linkable.brand
)
