import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Tabs,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { EntityListEditor, FieldDef } from "../../components/entity-list-editor"
import { sdk } from "../../lib/sdk"

const SETTINGS_FIELDS: FieldDef[] = [
  { key: "whatsapp", label: "رقم الواتساب", dir: "ltr", hint: "مثال: +965 5000 0000. فارغ = إخفاء زر الواتساب" },
  { key: "phone", label: "رقم الهاتف", dir: "ltr" },
  { key: "email", label: "البريد الإلكتروني", dir: "ltr" },
  { key: "address_ar", label: "العنوان (عربي)", dir: "rtl" },
  { key: "address_en", label: "Address (English)", dir: "ltr" },
  { key: "hours_ar", label: "ساعات العمل (عربي)", dir: "rtl" },
  { key: "hours_en", label: "Working hours (English)", dir: "ltr" },
]

const HERO_FIELDS: FieldDef[] = [
  { key: "title_ar", label: "العنوان (عربي)", required: true, dir: "rtl" },
  { key: "title_en", label: "Title (English)", required: true, dir: "ltr" },
  { key: "highlight_ar", label: "السطر المميز (عربي)", dir: "rtl" },
  { key: "highlight_en", label: "Highlight (English)", dir: "ltr" },
  { key: "subtitle_ar", label: "الوصف (عربي)", type: "textarea", dir: "rtl" },
  { key: "subtitle_en", label: "Subtitle (English)", type: "textarea", dir: "ltr" },
  { key: "eyebrow_ar", label: "الشارة العلوية (عربي)", dir: "rtl" },
  { key: "eyebrow_en", label: "Eyebrow (English)", dir: "ltr" },
  { key: "cta_label_ar", label: "نص الزر (عربي)", dir: "rtl" },
  { key: "cta_label_en", label: "Button label (English)", dir: "ltr" },
  { key: "cta_url", label: "رابط الزر", dir: "ltr", hint: "مسار داخلي مثل /categories/cctv أو رابط https://" },
  { key: "image_url", label: "رابط الصورة (اختياري)", dir: "ltr", hint: "https:// فقط. بدون صورة يظهر رسم أبراج الكويت" },
  { key: "rank", label: "الترتيب", type: "number" },
  { key: "is_active", label: "مفعّل", type: "boolean" },
  { key: "starts_at", label: "يبدأ الظهور", type: "datetime" },
  { key: "ends_at", label: "ينتهي الظهور", type: "datetime" },
]

const BADGE_FIELDS: FieldDef[] = [
  { key: "icon", label: "الأيقونة", required: true, dir: "ltr", hint: "shield, ret, truck, wallet, headset, wrench, bolt, check" },
  { key: "title_ar", label: "العنوان (عربي)", required: true, dir: "rtl" },
  { key: "title_en", label: "Title (English)", required: true, dir: "ltr" },
  { key: "subtitle_ar", label: "الوصف (عربي)", dir: "rtl" },
  { key: "subtitle_en", label: "Subtitle (English)", dir: "ltr" },
  { key: "rank", label: "الترتيب", type: "number" },
  { key: "is_active", label: "مفعّل", type: "boolean" },
]

function ContactSettings() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["/admin/content/settings"],
    queryFn: () =>
      sdk.client.fetch<{ settings: Record<string, string | null> }>(
        "/admin/content/settings"
      ),
  })
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (data?.settings) {
      setValues(
        Object.fromEntries(
          SETTINGS_FIELDS.map((f) => [f.key, data.settings[f.key] ?? ""])
        )
      )
    }
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/content/settings", {
        method: "POST",
        body: Object.fromEntries(
          SETTINGS_FIELDS.map((f) => [f.key, values[f.key] || null])
        ),
      }),
    onSuccess: () => {
      toast.success("تم حفظ بيانات التواصل")
      queryClient.invalidateQueries({ queryKey: ["/admin/content/settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Container className="flex flex-col gap-4 px-6 py-4">
      <div>
        <Heading level="h2">بيانات التواصل</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          تظهر في الهيدر والفوتر وزر الواتساب. الحقل الفارغ يخفي الرابط.
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SETTINGS_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <Label size="small" weight="plus">
              {f.label}
            </Label>
            <Input
              dir={f.dir}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
            />
            {f.hint && (
              <Text size="xsmall" className="text-ui-fg-muted">
                {f.hint}
              </Text>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button isLoading={save.isPending} onClick={() => save.mutate()}>
          حفظ
        </Button>
      </div>
    </Container>
  )
}

const StoreContentPage = () => (
  <div className="flex flex-col gap-4">
    <Tabs defaultValue="hero">
      <Tabs.List>
        <Tabs.Trigger value="hero">سلايدات الهيرو</Tabs.Trigger>
        <Tabs.Trigger value="badges">الضمانات والسياسات</Tabs.Trigger>
        <Tabs.Trigger value="contact">التواصل</Tabs.Trigger>
      </Tabs.List>
      <div className="mt-4">
        <Tabs.Content value="hero">
          <EntityListEditor
            title="سلايدات الهيرو"
            description="تظهر في أعلى الصفحة الرئيسية بالترتيب، وفي الفترة المحددة فقط."
            endpoint="/admin/content/hero-slides"
            listKey="hero_slides"
            itemKey="hero_slide"
            fields={HERO_FIELDS}
            columns={[
              { key: "rank", label: "#" },
              { key: "title_ar", label: "العنوان" },
              { key: "highlight_ar", label: "السطر المميز" },
            ]}
          />
        </Tabs.Content>
        <Tabs.Content value="badges">
          <EntityListEditor
            title="الضمانات والسياسات"
            description="التزامات تظهر للعميل في شريط الثقة. راجع كل التزام قبل تفعيله."
            endpoint="/admin/content/trust-badges"
            listKey="trust_badges"
            itemKey="trust_badge"
            fields={BADGE_FIELDS}
            columns={[
              { key: "rank", label: "#" },
              { key: "title_ar", label: "العنوان" },
              { key: "subtitle_ar", label: "الوصف" },
            ]}
          />
        </Tabs.Content>
        <Tabs.Content value="contact">
          <ContactSettings />
        </Tabs.Content>
      </div>
    </Tabs>
  </div>
)

export const config = defineRouteConfig({
  label: "محتوى المتجر",
  icon: ChatBubbleLeftRight,
})

export default StoreContentPage
