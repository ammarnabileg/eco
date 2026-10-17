import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import CatalogModule from "../modules/catalog"

// Which categories a spec template applies to. A category can use several
// templates and a template can serve several categories (bullet, dome...).
export default defineLink(
  { linkable: ProductModule.linkable.productCategory, isList: true },
  { linkable: CatalogModule.linkable.specTemplate, isList: true }
)
