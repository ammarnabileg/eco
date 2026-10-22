import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"
import { Tabs } from "@medusajs/ui"

import { AddonGroupsTab } from "../../components/catalog/addon-groups-tab"
import { InstallRequestsTab } from "../../components/catalog/install-requests-tab"
import { QuoteRequestsTab } from "../../components/catalog/quote-requests-tab"
import { SpecTemplatesTab } from "../../components/catalog/spec-templates-tab"
import { EntityListEditor, FieldDef } from "../../components/entity-list-editor"

const BRAND_FIELDS: FieldDef[] = [
  { key: "name", label: "الاسم", required: true, dir: "ltr" },
  { key: "handle", label: "المعرّف (handle)", required: true, dir: "ltr", hint: "حروف إنجليزية صغيرة وشرطات، مثل tp-link" },
  { key: "logo_url", label: "رابط الشعار", dir: "ltr", hint: "https:// فقط" },
  { key: "description_ar", label: "نبذة (عربي)", type: "textarea", dir: "rtl" },
  { key: "description_en", label: "About (English)", type: "textarea", dir: "ltr" },
  { key: "rank", label: "الترتيب", type: "number" },
  { key: "is_active", label: "مفعّل", type: "boolean" },
]

const CatalogPage = () => (
  <div className="flex flex-col gap-4">
    <Tabs defaultValue="templates">
      <Tabs.List>
        <Tabs.Trigger value="templates">قوالب المواصفات</Tabs.Trigger>
        <Tabs.Trigger value="brands">البراندات</Tabs.Trigger>
        <Tabs.Trigger value="addons">القطع الإضافية</Tabs.Trigger>
        <Tabs.Trigger value="quotes">طلبات عرض السعر</Tabs.Trigger>
        <Tabs.Trigger value="installs">طلبات التركيب</Tabs.Trigger>
      </Tabs.List>
      <div className="mt-4">
        <Tabs.Content value="templates">
          <SpecTemplatesTab />
        </Tabs.Content>
        <Tabs.Content value="brands">
          <EntityListEditor
            title="البراندات"
            description="تظهر في صفحة المنتج وفلتر البراند. اربط البراند بالمنتج من صفحة المنتج."
            endpoint="/admin/catalog/brands"
            listKey="brands"
            itemKey="brand"
            fields={BRAND_FIELDS}
            columns={[
              { key: "rank", label: "#" },
              { key: "name", label: "الاسم" },
              { key: "handle", label: "المعرّف" },
            ]}
          />
        </Tabs.Content>
        <Tabs.Content value="addons">
          <AddonGroupsTab />
        </Tabs.Content>
        <Tabs.Content value="quotes">
          <QuoteRequestsTab />
        </Tabs.Content>
        <Tabs.Content value="installs">
          <InstallRequestsTab />
        </Tabs.Content>
      </div>
    </Tabs>
  </div>
)

export const config = defineRouteConfig({
  label: "الكتالوج",
  icon: Tag,
})

export default CatalogPage
