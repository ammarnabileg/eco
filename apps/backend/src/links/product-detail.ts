import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import CatalogModule from "../modules/catalog"

export default defineLink(ProductModule.linkable.product, {
  linkable: CatalogModule.linkable.productDetail,
  deleteCascade: true,
})
