import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ReactNode, useEffect, useMemo, useState } from "react"

import {
  AddonGroup,
  Brand,
  FaqEntry,
  formatKwd,
  linesToList,
  orNull,
  SpecAttribute,
} from "../lib/catalog"
import { sdk } from "../lib/sdk"

type SpecValue = string | number | boolean | string[] | { ar: string; en: string }

type Detail = {
  title_en?: string | null
  subtitle_ar?: string | null
  subtitle_en?: string | null
  description_en?: string | null
  highlights_ar?: string[] | null
  highlights_en?: string[] | null
  box_contents_ar?: string[] | null
  box_contents_en?: string[] | null
  specs?: Record<string, SpecValue> | null
  faq?: FaqEntry[] | null
  seo_title_ar?: string | null
  seo_title_en?: string | null
  seo_description_ar?: string | null
  seo_description_en?: string | null
  mpn?: string | null
  series?: string | null
  price_on_request?: boolean
  warranty_months?: number | null
  source_url?: string | null
}

type Catalog = {
  product_id: string
  detail: Detail | null
  brand: { id: string; name: string } | null
  addon_group_ids: string[]
  attributes: SpecAttribute[]
}

const NONE = "__none"

const TEXT_FIELDS = [
  "title_en",
  "subtitle_ar",
  "subtitle_en",
  "description_en",
  "seo_title_ar",
  "seo_title_en",
  "seo_description_ar",
  "seo_description_en",
  "mpn",
  "series",
  "source_url",
] as const

type TextField = (typeof TEXT_FIELDS)[number]

type FormState = {
  text: Record<TextField, string>
  warranty_months: string
  price_on_request: boolean
  brand_id: string
  highlights_ar: string
  highlights_en: string
  box_contents_ar: string
  box_contents_en: string
  faq: FaqEntry[]
  specs: Record<string, SpecValue | "">
  addon_group_ids: string[]
}

const toForm = (c: Catalog): FormState => {
  const d = c.detail ?? {}
  return {
    text: Object.fromEntries(TEXT_FIELDS.map((k) => [k, (d[k] as string | null) ?? ""])) as Record<
      TextField,
      string
    >,
    warranty_months: d.warranty_months != null ? String(d.warranty_months) : "",
    price_on_request: Boolean(d.price_on_request),
    brand_id: c.brand?.id ?? NONE,
    highlights_ar: (d.highlights_ar ?? []).join("\n"),
    highlights_en: (d.highlights_en ?? []).join("\n"),
    box_contents_ar: (d.box_contents_ar ?? []).join("\n"),
    box_contents_en: (d.box_contents_en ?? []).join("\n"),
    faq: d.faq ?? [],
    specs: { ...(d.specs ?? {}) },
    addon_group_ids: c.addon_group_ids ?? [],
  }
}

// Spec values the API accepts; empty values are left out.
const cleanSpecs = (specs: FormState["specs"], attributes: SpecAttribute[]) => {
  const out: Record<string, SpecValue> = {}
  for (const a of attributes) {
    const v = specs[a.key]
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) {
      continue
    }
    if (a.type === "number") {
      out[a.key] = Number(v)
    } else if (typeof v === "string") {
      out[a.key] = v.trim()
    } else {
      out[a.key] = v
    }
  }
  return out
}

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 px-6 py-4">
    <div>
      <Heading level="h3">{title}</Heading>
      {hint && (
        <Text size="small" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )}
    </div>
    {children}
  </div>
)

const Field = ({
  label,
  hint,
  children,
  extra,
}: {
  label: string
  hint?: string
  children: ReactNode
  extra?: ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-2">
      <Label size="small" weight="plus">
        {label}
      </Label>
      {extra}
    </div>
    {children}
    {hint && (
      <Text size="xsmall" className="text-ui-fg-muted">
        {hint}
      </Text>
    )}
  </div>
)

const Counter = ({ value, max }: { value: string; max: number }) => (
  <Text size="xsmall" className={value.length > max ? "text-ui-fg-error" : "text-ui-fg-muted"}>
    {value.length}/{max}
  </Text>
)

const SpecInput = ({
  attr,
  value,
  onChange,
}: {
  attr: SpecAttribute
  value: SpecValue | "" | undefined
  onChange: (v: SpecValue | "") => void
}) => {
  if (attr.type === "select") {
    return (
      <Select value={typeof value === "string" && value ? value : NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value={NONE}>—</Select.Item>
          {(attr.options ?? []).map((o) => (
            <Select.Item key={o.value} value={o.value}>
              {o.label_ar}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    )
  }
  if (attr.type === "multiselect") {
    const list = Array.isArray(value) ? value : []
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {(attr.options ?? []).map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={list.includes(o.value)}
              onCheckedChange={(checked) =>
                onChange(checked ? [...list, o.value] : list.filter((x) => x !== o.value))
              }
            />
            {o.label_ar}
          </label>
        ))}
      </div>
    )
  }
  if (attr.type === "boolean") {
    const current = value === true ? "yes" : value === false ? "no" : NONE
    return (
      <Select value={current} onValueChange={(v) => onChange(v === NONE ? "" : v === "yes")}>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value={NONE}>—</Select.Item>
          <Select.Item value="yes">نعم</Select.Item>
          <Select.Item value="no">لا</Select.Item>
        </Select.Content>
      </Select>
    )
  }
  if (attr.type === "number") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          dir="ltr"
          value={value === undefined || value === "" ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        {attr.unit && (
          <Text size="small" className="text-ui-fg-subtle">
            {attr.unit}
          </Text>
        )}
      </div>
    )
  }
  // Free text; translated values ({ar, en}) are edited as the Arabic text.
  const text =
    value && typeof value === "object" && !Array.isArray(value) ? value.ar : value === undefined ? "" : String(value)
  return <Input value={text} onChange={(e) => onChange(e.target.value)} />
}

const SerpPreview = ({ title, description, dir }: { title: string; description: string; dir: "rtl" | "ltr" }) => (
  <div dir={dir} className="rounded-lg border border-ui-border-base p-3">
    <Text size="xsmall" className="text-ui-fg-muted">
      laly.com.kw › products
    </Text>
    <Text className="truncate text-[#1a0dab]">{title || "—"}</Text>
    <Text size="small" className="line-clamp-2 text-ui-fg-subtle">
      {description || "—"}
    </Text>
  </div>
)

const ProductCatalogWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const endpoint = `/admin/catalog/products/${product.id}`

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => sdk.client.fetch<{ catalog: Catalog }>(endpoint),
  })
  const { data: brands } = useQuery({
    queryKey: ["/admin/catalog/brands"],
    queryFn: () => sdk.client.fetch<{ brands: Brand[] }>("/admin/catalog/brands"),
  })
  const { data: groups } = useQuery({
    queryKey: ["/admin/catalog/addon-groups"],
    queryFn: () => sdk.client.fetch<{ addon_groups: AddonGroup[] }>("/admin/catalog/addon-groups"),
  })

  const [form, setForm] = useState<FormState | null>(null)
  useEffect(() => {
    if (data?.catalog) {
      setForm(toForm(data.catalog))
    }
  }, [data])

  const attributes = useMemo(() => data?.catalog.attributes ?? [], [data])
  const grouped = useMemo(() => {
    const map = new Map<string, SpecAttribute[]>()
    for (const a of attributes) {
      const g = a.group_ar || "المواصفات"
      map.set(g, [...(map.get(g) ?? []), a])
    }
    return [...map.entries()]
  }, [attributes])

  const save = useMutation({
    mutationFn: (f: FormState) =>
      sdk.client.fetch<{ catalog: Catalog }>(endpoint, {
        method: "POST",
        body: {
          brand_id: f.brand_id === NONE ? null : f.brand_id,
          addon_group_ids: f.addon_group_ids,
          detail: {
            ...Object.fromEntries(TEXT_FIELDS.map((k) => [k, orNull(f.text[k])])),
            warranty_months: f.warranty_months === "" ? null : Number(f.warranty_months),
            price_on_request: f.price_on_request,
            highlights_ar: linesToList(f.highlights_ar),
            highlights_en: linesToList(f.highlights_en),
            box_contents_ar: linesToList(f.box_contents_ar),
            box_contents_en: linesToList(f.box_contents_en),
            faq: f.faq.filter((q) => q.question_ar.trim() || q.question_en.trim()),
            specs: cleanSpecs(f.specs, attributes),
          },
        },
      }),
    onSuccess: (res) => {
      toast.success("تم حفظ بيانات الكتالوج")
      queryClient.setQueryData([endpoint], res)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !form) {
    return (
      <Container className="px-6 py-4">
        <Text>جاري التحميل…</Text>
      </Container>
    )
  }

  const setText = (k: TextField, v: string) => setForm((s) => (s ? { ...s, text: { ...s.text, [k]: v } } : s))
  const setSpec = (k: string, v: SpecValue | "") =>
    setForm((s) => (s ? { ...s, specs: { ...s.specs, [k]: v } } : s))
  const setFaq = (i: number, k: keyof FaqEntry, v: string) =>
    setForm((s) => (s ? { ...s, faq: s.faq.map((q, j) => (j === i ? { ...q, [k]: v } : q)) } : s))

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">الكتالوج والمواصفات</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            البراند والمواصفات والمحتوى الإنجليزي والسيو والقطع الإضافية لهذا المنتج.
          </Text>
        </div>
        <Button size="small" isLoading={save.isPending} onClick={() => save.mutate(form)}>
          حفظ
        </Button>
      </div>

      <Section title="الأساسيات">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="البراند">
            <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={NONE}>بدون</Select.Item>
                {(brands?.brands ?? []).map((b) => (
                  <Select.Item key={b.id} value={b.id}>
                    {b.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
          <Field label="رقم الموديل (MPN)" hint="مثال: DS-2CD2047G2-LU. العملاء وجوجل يبحثون به.">
            <Input dir="ltr" value={form.text.mpn} onChange={(e) => setText("mpn", e.target.value)} />
          </Field>
          <Field label="السلسلة (Series)">
            <Input dir="ltr" value={form.text.series} onChange={(e) => setText("series", e.target.value)} />
          </Field>
          <Field label="الضمان (بالأشهر)">
            <Input
              type="number"
              dir="ltr"
              value={form.warranty_months}
              onChange={(e) => setForm({ ...form, warranty_months: e.target.value })}
            />
          </Field>
          <Field label="مصدر المواصفات الرسمي" hint="رابط https لصفحة أو داتاشيت الشركة المصنعة">
            <Input dir="ltr" value={form.text.source_url} onChange={(e) => setText("source_url", e.target.value)} />
          </Field>
          <Field
            label="السعر عند الطلب"
            hint="يظهر زر اطلب عرض سعر بدل أضف للسلة، ويستبعد المنتج من Google Shopping"
          >
            <Switch
              checked={form.price_on_request}
              onCheckedChange={(v) => setForm({ ...form, price_on_request: v })}
            />
          </Field>
        </div>
      </Section>

      <Section title="المواصفات" hint="الحقول تأتي من قالب مواصفات تصنيف المنتج. الحقول المعلّمة بفلتر تظهر كفلاتر في المتجر.">
        {!attributes.length ? (
          <Text size="small" className="text-ui-fg-subtle">
            لا توجد قالب مواصفات لتصنيف هذا المنتج. أضف المنتج لتصنيف، أو اربط قالبًا بالتصنيف من صفحة الكتالوج.
          </Text>
        ) : (
          grouped.map(([group, attrs]) => (
            <div key={group} className="flex flex-col gap-3">
              <Text size="small" weight="plus" className="text-ui-fg-subtle">
                {group}
              </Text>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {attrs.map((a) => (
                  <Field
                    key={a.key}
                    label={`${a.label_ar}${a.required ? " *" : ""}`}
                    extra={
                      a.filterable ? (
                        <Badge size="2xsmall" color="blue">
                          فلتر
                        </Badge>
                      ) : undefined
                    }
                  >
                    <SpecInput attr={a} value={form.specs[a.key]} onChange={(v) => setSpec(a.key, v)} />
                  </Field>
                ))}
              </div>
            </div>
          ))
        )}
      </Section>

      <Section title="المحتوى الإنجليزي والعنوان الفرعي" hint="العنوان والوصف العربي يُحرران من أعلى صفحة المنتج.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Title (English)">
            <Input dir="ltr" value={form.text.title_en} onChange={(e) => setText("title_en", e.target.value)} />
          </Field>
          <Field label="العنوان الفرعي (عربي)">
            <Input value={form.text.subtitle_ar} onChange={(e) => setText("subtitle_ar", e.target.value)} />
          </Field>
          <Field label="Subtitle (English)">
            <Input dir="ltr" value={form.text.subtitle_en} onChange={(e) => setText("subtitle_en", e.target.value)} />
          </Field>
        </div>
        <Field label="Description (English)">
          <Textarea
            dir="ltr"
            rows={6}
            value={form.text.description_en}
            onChange={(e) => setText("description_en", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="أهم المميزات" hint="ميزة في كل سطر، تظهر كنقاط في تبويب «نظرة عامة» بصفحة المنتج (حتى 12).">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="المميزات (عربي)">
            <Textarea
              rows={5}
              value={form.highlights_ar}
              onChange={(e) => setForm({ ...form, highlights_ar: e.target.value })}
            />
          </Field>
          <Field label="Highlights (English)">
            <Textarea
              dir="ltr"
              rows={5}
              value={form.highlights_en}
              onChange={(e) => setForm({ ...form, highlights_en: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="محتويات الصندوق"
        hint="عنصر في كل سطر، من صفحة الشركة المصنّعة الرسمية فقط (حتى 30). يظهر تبويب «محتويات الصندوق» في صفحة المنتج لما تتملى."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="محتويات الصندوق (عربي)">
            <Textarea
              rows={5}
              value={form.box_contents_ar}
              onChange={(e) => setForm({ ...form, box_contents_ar: e.target.value })}
            />
          </Field>
          <Field label="In the box (English)">
            <Textarea
              dir="ltr"
              rows={5}
              value={form.box_contents_en}
              onChange={(e) => setForm({ ...form, box_contents_en: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section title="الأسئلة الشائعة" hint="تظهر في صفحة المنتج وتُضاف كبيانات FAQ لمحركات البحث والذكاء الاصطناعي.">
        {form.faq.map((q, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-ui-border-base p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input placeholder="السؤال" value={q.question_ar} onChange={(e) => setFaq(i, "question_ar", e.target.value)} />
              <Input
                dir="ltr"
                placeholder="Question"
                value={q.question_en}
                onChange={(e) => setFaq(i, "question_en", e.target.value)}
              />
              <Textarea placeholder="الإجابة" value={q.answer_ar} onChange={(e) => setFaq(i, "answer_ar", e.target.value)} />
              <Textarea
                dir="ltr"
                placeholder="Answer"
                value={q.answer_en}
                onChange={(e) => setFaq(i, "answer_en", e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="small"
                variant="transparent"
                onClick={() => setForm({ ...form, faq: form.faq.filter((_, j) => j !== i) })}
              >
                حذف السؤال
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button
            size="small"
            variant="secondary"
            onClick={() =>
              setForm({
                ...form,
                faq: [...form.faq, { question_ar: "", answer_ar: "", question_en: "", answer_en: "" }],
              })
            }
          >
            إضافة سؤال
          </Button>
        </div>
      </Section>

      <Section title="السيو (SEO)" hint="فارغ = يُستخدم عنوان ووصف المنتج تلقائيًا.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Field label="عنوان السيو (عربي)" extra={<Counter value={form.text.seo_title_ar} max={70} />}>
              <Input value={form.text.seo_title_ar} onChange={(e) => setText("seo_title_ar", e.target.value)} />
            </Field>
            <Field label="وصف السيو (عربي)" extra={<Counter value={form.text.seo_description_ar} max={170} />}>
              <Textarea
                value={form.text.seo_description_ar}
                onChange={(e) => setText("seo_description_ar", e.target.value)}
              />
            </Field>
            <SerpPreview
              dir="rtl"
              title={form.text.seo_title_ar || product.title}
              description={form.text.seo_description_ar || product.description || ""}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Field label="SEO title (English)" extra={<Counter value={form.text.seo_title_en} max={70} />}>
              <Input dir="ltr" value={form.text.seo_title_en} onChange={(e) => setText("seo_title_en", e.target.value)} />
            </Field>
            <Field label="SEO description (English)" extra={<Counter value={form.text.seo_description_en} max={170} />}>
              <Textarea
                dir="ltr"
                value={form.text.seo_description_en}
                onChange={(e) => setText("seo_description_en", e.target.value)}
              />
            </Field>
            <SerpPreview
              dir="ltr"
              title={form.text.seo_title_en || form.text.title_en}
              description={form.text.seo_description_en || form.text.description_en}
            />
          </div>
        </div>
      </Section>

      <Section title="القطع الإضافية" hint="مجموعات يختار منها العميل مع المنتج (رام، SSD، هارد...). تُدار من صفحة الكتالوج.">
        {!(groups?.addon_groups ?? []).length ? (
          <Text size="small" className="text-ui-fg-subtle">
            لا توجد مجموعات قطع إضافية بعد.
          </Text>
        ) : (
          <div className="flex flex-col gap-2">
            {(groups?.addon_groups ?? []).map((g) => (
              <label key={g.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={form.addon_group_ids.includes(g.id)}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      addon_group_ids: checked
                        ? [...form.addon_group_ids, g.id]
                        : form.addon_group_ids.filter((x) => x !== g.id),
                    })
                  }
                />
                <span>
                  <span className="font-medium">{g.name_ar}</span>
                  <span className="text-ui-fg-subtle">
                    {" "}
                    — {g.options.length} خيارات:{" "}
                    {g.options.map((o) => `${o.name_ar} (${formatKwd(o.price)})`).join("، ")}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <div className="flex justify-end px-6 py-4">
        <Button isLoading={save.isPending} onClick={() => save.mutate(form)}>
          حفظ
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductCatalogWidget
