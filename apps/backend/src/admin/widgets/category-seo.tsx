import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProductCategory, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Input, Label, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { SpecTemplate } from "../lib/catalog"
import { sdk } from "../lib/sdk"

const FIELDS: { key: string; label: string; dir: "rtl" | "ltr"; type?: "textarea"; max?: number }[] = [
  { key: "name_en", label: "Name (English)", dir: "ltr" },
  { key: "description_ar", label: "وصف التصنيف (عربي)", dir: "rtl", type: "textarea" },
  { key: "description_en", label: "Category description (English)", dir: "ltr", type: "textarea" },
  { key: "seo_title_ar", label: "عنوان السيو (عربي)", dir: "rtl", max: 70 },
  { key: "seo_title_en", label: "SEO title (English)", dir: "ltr", max: 70 },
  { key: "seo_description_ar", label: "وصف السيو (عربي)", dir: "rtl", type: "textarea", max: 170 },
  { key: "seo_description_en", label: "SEO description (English)", dir: "ltr", type: "textarea", max: 170 },
]

const CategorySeoWidget = ({ data: category }: DetailWidgetProps<AdminProductCategory>) => {
  const queryClient = useQueryClient()
  const metadata = (category.metadata ?? {}) as Record<string, unknown>
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, typeof metadata[f.key] === "string" ? (metadata[f.key] as string) : ""]))
  )

  const { data: templates } = useQuery({
    queryKey: ["/admin/catalog/spec-templates"],
    queryFn: () => sdk.client.fetch<{ spec_templates: SpecTemplate[] }>("/admin/catalog/spec-templates"),
  })
  const applied = (templates?.spec_templates ?? []).filter((t) =>
    (t.product_categories ?? []).some((c) => c.id === category.id)
  )

  const save = useMutation({
    // Merge so metadata written by other tools (importer, AI) is kept.
    mutationFn: () =>
      sdk.admin.productCategory.update(category.id, {
        metadata: {
          ...metadata,
          ...Object.fromEntries(FIELDS.map((f) => [f.key, values[f.key].trim() || null])),
        },
      }),
    onSuccess: () => {
      toast.success("تم حفظ محتوى التصنيف")
      queryClient.invalidateQueries({ queryKey: ["product_categories"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">المحتوى والسيو</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            الاسم الإنجليزي ووصف التصنيف يظهران أعلى صفحة التصنيف في المتجر.
          </Text>
        </div>
        <Button size="small" isLoading={save.isPending} onClick={() => save.mutate()}>
          حفظ
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label size="small" weight="plus">
                {f.label}
              </Label>
              {f.max && (
                <Text
                  size="xsmall"
                  className={values[f.key].length > f.max ? "text-ui-fg-error" : "text-ui-fg-muted"}
                >
                  {values[f.key].length}/{f.max}
                </Text>
              )}
            </div>
            {f.type === "textarea" ? (
              <Textarea
                dir={f.dir}
                value={values[f.key]}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            ) : (
              <Input
                dir={f.dir}
                value={values[f.key]}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 px-6 py-4">
        <Text size="small" weight="plus">
          قوالب المواصفات المطبقة
        </Text>
        {applied.length ? (
          <div className="flex flex-wrap gap-2">
            {applied.map((t) => (
              <Badge key={t.id} size="2xsmall">
                {t.name_ar} ({t.attributes.length} حقل)
              </Badge>
            ))}
          </div>
        ) : (
          <Text size="small" className="text-ui-fg-subtle">
            لا يوجد قالب مرتبط مباشرة بهذا التصنيف (قد يرث قالب التصنيف الأب).
          </Text>
        )}
        <a className="text-ui-fg-interactive text-sm" href="/app/catalog">
          إدارة القوالب من صفحة الكتالوج
        </a>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategorySeoWidget
