import {
  Badge,
  Button,
  Checkbox,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { SpecAttribute, SpecTemplate } from "../../lib/catalog"
import { sdk } from "../../lib/sdk"

const ENDPOINT = "/admin/catalog/spec-templates"

const TYPES: { value: SpecAttribute["type"]; label: string }[] = [
  { value: "text", label: "نص" },
  { value: "number", label: "رقم" },
  { value: "boolean", label: "نعم / لا" },
  { value: "select", label: "اختيار واحد" },
  { value: "multiselect", label: "اختيار متعدد" },
]

type Category = { id: string; name: string; handle: string; parent_category_id: string | null }

// Attribute rows as edited: options kept as "value | عربي | English" lines.
type Row = Omit<SpecAttribute, "options"> & { optionsText: string; originalKey?: string }

const toRow = (a: SpecAttribute): Row => ({
  ...a,
  originalKey: a.key,
  optionsText: (a.options ?? []).map((o) => `${o.value} | ${o.label_ar} | ${o.label_en}`).join("\n"),
})

const fromRow = (r: Row): SpecAttribute => {
  const hasOptions = r.type === "select" || r.type === "multiselect"
  return {
    key: r.key.trim(),
    label_ar: r.label_ar.trim(),
    label_en: r.label_en.trim(),
    type: r.type,
    unit: r.unit?.trim() || null,
    group_ar: r.group_ar?.trim() || null,
    group_en: r.group_en?.trim() || null,
    filterable: Boolean(r.filterable),
    required: Boolean(r.required),
    ...(hasOptions
      ? {
          options: r.optionsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => {
              const [value, ar, en] = l.split("|").map((p) => p.trim())
              return { value, label_ar: ar || value, label_en: en || ar || value }
            }),
        }
      : {}),
  }
}

// Categories sorted as a tree, each with its depth for indentation.
const flattenTree = (categories: Category[]) => {
  const children = new Map<string | null, Category[]>()
  for (const c of categories) {
    const key = c.parent_category_id ?? null
    children.set(key, [...(children.get(key) ?? []), c])
  }
  const out: { category: Category; depth: number }[] = []
  const walk = (parent: string | null, depth: number) => {
    for (const c of (children.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name, "ar"))) {
      out.push({ category: c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

const TemplateDrawer = ({ template, onClose }: { template: SpecTemplate | null; onClose: () => void }) => {
  const queryClient = useQueryClient()
  const [name, setName] = useState({
    name_ar: template?.name_ar ?? "",
    name_en: template?.name_en ?? "",
    rank: String(template?.rank ?? 0),
  })
  const [categoryIds, setCategoryIds] = useState<string[]>(
    (template?.product_categories ?? []).map((c) => c.id)
  )
  const [rows, setRows] = useState<Row[]>((template?.attributes ?? []).map(toRow))

  const { data: cats } = useQuery({
    queryKey: ["/admin/product-categories", "tree"],
    queryFn: () =>
      sdk.client.fetch<{ product_categories: Category[] }>("/admin/product-categories", {
        query: { limit: 500, fields: "id,name,handle,parent_category_id" },
      }),
  })
  const tree = useMemo(() => flattenTree(cats?.product_categories ?? []), [cats])

  const renamed = rows.filter((r) => r.originalKey && r.originalKey !== r.key)

  const update = (i: number, patch: Partial<Row>) =>
    setRows((s) => s.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const move = (i: number, by: number) =>
    setRows((s) => {
      const j = i + by
      if (j < 0 || j >= s.length) return s
      const next = [...s]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(template ? `${ENDPOINT}/${template.id}` : ENDPOINT, {
        method: "POST",
        body: {
          name_ar: name.name_ar,
          name_en: name.name_en,
          rank: Number(name.rank) || 0,
          category_ids: categoryIds,
          attributes: rows.map(fromRow),
        },
      }),
    onSuccess: () => {
      toast.success("تم حفظ القالب")
      queryClient.invalidateQueries({ queryKey: [ENDPOINT] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content className="max-w-5xl">
        <Drawer.Header>
          <Drawer.Title>{template ? "تعديل قالب مواصفات" : "قالب مواصفات جديد"}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                الاسم (عربي) *
              </Label>
              <Input value={name.name_ar} onChange={(e) => setName({ ...name, name_ar: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                Name (English) *
              </Label>
              <Input dir="ltr" value={name.name_en} onChange={(e) => setName({ ...name, name_en: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                الترتيب
              </Label>
              <Input type="number" value={name.rank} onChange={(e) => setName({ ...name, rank: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label size="small" weight="plus">
              التصنيفات التي يطبق عليها القالب
            </Label>
            <Text size="xsmall" className="text-ui-fg-muted">
              القالب يطبق أيضًا على التصنيفات الفرعية للتصنيف المختار.
            </Text>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-ui-border-base p-3">
              {tree.map(({ category, depth }) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 py-0.5 text-sm"
                  style={{ paddingInlineStart: depth * 20 }}
                >
                  <Checkbox
                    checked={categoryIds.includes(category.id)}
                    onCheckedChange={(checked) =>
                      setCategoryIds((s) => (checked ? [...s, category.id] : s.filter((x) => x !== category.id)))
                    }
                  />
                  {category.name}
                  <span className="text-ui-fg-muted" dir="ltr">
                    {category.handle}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label size="small" weight="plus">
                الحقول
              </Label>
              <Button
                size="small"
                variant="secondary"
                onClick={() =>
                  setRows((s) => [
                    ...s,
                    { key: "", label_ar: "", label_en: "", type: "text", optionsText: "", filterable: false },
                  ])
                }
              >
                إضافة حقل
              </Button>
            </div>
            {renamed.length > 0 && (
              <Text size="small" className="text-ui-fg-error">
                تنبيه: تغيير مفتاح حقل موجود ({renamed.map((r) => r.originalKey).join("، ")}) يجعل القيم المحفوظة في
                المنتجات بلا حقل. غيّر التسمية العربية/الإنجليزية بدلًا من المفتاح.
              </Text>
            )}
            {rows.map((r, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-ui-border-base p-3">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Input dir="ltr" placeholder="key (resolution_mp)" value={r.key} onChange={(e) => update(i, { key: e.target.value })} />
                  <Input placeholder="الاسم بالعربي" value={r.label_ar} onChange={(e) => update(i, { label_ar: e.target.value })} />
                  <Input dir="ltr" placeholder="English label" value={r.label_en} onChange={(e) => update(i, { label_en: e.target.value })} />
                  <Select value={r.type} onValueChange={(v) => update(i, { type: v as SpecAttribute["type"] })}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {TYPES.map((t) => (
                        <Select.Item key={t.value} value={t.value}>
                          {t.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  <Input dir="ltr" placeholder="الوحدة (MP, mm, GB)" value={r.unit ?? ""} onChange={(e) => update(i, { unit: e.target.value })} />
                  <Input placeholder="المجموعة (عربي)" value={r.group_ar ?? ""} onChange={(e) => update(i, { group_ar: e.target.value })} />
                  <Input dir="ltr" placeholder="Group (English)" value={r.group_en ?? ""} onChange={(e) => update(i, { group_en: e.target.value })} />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={Boolean(r.filterable)} onCheckedChange={(v) => update(i, { filterable: v })} />
                      فلتر
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={Boolean(r.required)} onCheckedChange={(v) => update(i, { required: v })} />
                      إلزامي
                    </label>
                  </div>
                </div>
                {(r.type === "select" || r.type === "multiselect") && (
                  <Textarea
                    dir="ltr"
                    rows={4}
                    placeholder={"colorvu | ملونة ColorVu | ColorVu\nir | أشعة تحت الحمراء | Infrared"}
                    value={r.optionsText}
                    onChange={(e) => update(i, { optionsText: e.target.value })}
                  />
                )}
                <div className="flex justify-end gap-2">
                  <Button size="small" variant="transparent" onClick={() => move(i, -1)}>
                    ↑
                  </Button>
                  <Button size="small" variant="transparent" onClick={() => move(i, 1)}>
                    ↓
                  </Button>
                  <Button size="small" variant="transparent" onClick={() => setRows((s) => s.filter((_, j) => j !== i))}>
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary">إلغاء</Button>
          </Drawer.Close>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>
            حفظ
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

export const SpecTemplatesTab = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<SpecTemplate | "new" | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: [ENDPOINT],
    queryFn: () => sdk.client.fetch<{ spec_templates: SpecTemplate[] }>(ENDPOINT),
  })
  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`${ENDPOINT}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الحذف")
      queryClient.invalidateQueries({ queryKey: [ENDPOINT] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">قوالب المواصفات</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            كل قالب يحدد حقول المواصفات لنوع منتج، ويولّد نموذج المنتج في الأدمن وفلاتر المتجر.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setEditing("new")}>
          إضافة
        </Button>
      </div>
      {isLoading ? (
        <Text className="px-6 py-4">جاري التحميل…</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>القالب</Table.HeaderCell>
              <Table.HeaderCell>الحقول</Table.HeaderCell>
              <Table.HeaderCell>التصنيفات</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data?.spec_templates ?? []).map((t) => (
              <Table.Row key={t.id}>
                <Table.Cell>
                  {t.name_ar} <span className="text-ui-fg-muted">{t.name_en}</span>
                </Table.Cell>
                <Table.Cell>
                  {t.attributes.length}{" "}
                  <span className="text-ui-fg-muted">({t.attributes.filter((a) => a.filterable).length} فلتر)</span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-wrap gap-1">
                    {(t.product_categories ?? []).map((c) => (
                      <Badge key={c.id} size="2xsmall">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </Table.Cell>
                <Table.Cell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button size="small" variant="transparent" onClick={() => setEditing(t)}>
                      تعديل
                    </Button>
                    <Button
                      size="small"
                      variant="transparent"
                      onClick={() => window.confirm("حذف القالب؟ ستختفي حقوله وفلاتره من المنتجات.") && remove.mutate(t.id)}
                    >
                      حذف
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      {editing && (
        <TemplateDrawer
          key={editing === "new" ? "new" : editing.id}
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Container>
  )
}
