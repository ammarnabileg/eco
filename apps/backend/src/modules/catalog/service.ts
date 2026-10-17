import { MedusaService } from "@medusajs/framework/utils"

import AddonGroup from "./models/addon-group"
import AddonOption from "./models/addon-option"
import Brand from "./models/brand"
import ProductDetail from "./models/product-detail"
import QuoteRequest from "./models/quote-request"
import SpecTemplate from "./models/spec-template"

class CatalogModuleService extends MedusaService({
  Brand,
  ProductDetail,
  SpecTemplate,
  AddonGroup,
  AddonOption,
  QuoteRequest,
}) {}

export default CatalogModuleService
