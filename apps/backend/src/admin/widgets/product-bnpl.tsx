import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"

import { BnplSettings } from "../components/bnpl/bnpl-settings"

const ProductBnplWidget = ({ data }: DetailWidgetProps<AdminProduct>) => (
  <BnplSettings kind="product" id={data.id} metadata={(data.metadata ?? null) as Record<string, unknown> | null} />
)

export const config = defineWidgetConfig({ zone: "product.details.side.after" })

export default ProductBnplWidget
