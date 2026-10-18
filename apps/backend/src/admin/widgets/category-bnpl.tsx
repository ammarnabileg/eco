import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProductCategory, DetailWidgetProps } from "@medusajs/framework/types"

import { BnplSettings } from "../components/bnpl/bnpl-settings"

const CategoryBnplWidget = ({ data }: DetailWidgetProps<AdminProductCategory>) => (
  <BnplSettings kind="category" id={data.id} metadata={(data.metadata ?? null) as Record<string, unknown> | null} />
)

export const config = defineWidgetConfig({ zone: "product_category.details.after" })

export default CategoryBnplWidget
