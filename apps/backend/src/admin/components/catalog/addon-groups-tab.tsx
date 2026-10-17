import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { ADDON_KINDS, AddonGroup, formatKwd } from "../../lib/catalog"
import { sdk } from "../../lib/sdk"

const ENDPOINT = "/admin/catalog/addon-groups"

type OptionRow = {
  id?: string
  name_ar: string
  name_en: string
  price: string
  sku: string
  is_active: boolean
  rank: string
}

const GroupDrawer = ({ group, onClose }: { group: AddonGroup | null; onClose: () => void }) => {
  const queryClient = useQueryClient()
  const [values, setValues] = useState({
    name_ar: group?.name_ar ?? "",
    name_en: group?.name_en ?? "",
    kind: group?.kind ?? "other",
    selection: group?.selection ?? "single",
    is_required: group?.is_required ?? false,
    rank: String(group?.rank ?? 0),
  })
  const [options, setOptions] = useState<OptionRow[]>(
    (group?.options ?? [])
      .slice()
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((o) => ({
        id: o.id,
        name_ar: o.name_ar,
        name_en: o.name_en,
        price: Number(o.price).toFixed(3),
        sku: o.sku ?? "",
        is_active: o.is_active !== false,
        rank: String(o.rank ?? 0),
      }))
  )
  const update = (i: number, patch: Partial<OptionRow>) =>
    setOptions((s) => s.map((o, j) => (j === i ? { ...o, ...patch } : o)))

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(group ? `${ENDPOINT}/${group.id}` : ENDPOINT, {
        method: "POST",
        body: {
          ...values,
          rank: Number(values.rank) || 0,
          // Rows keep their id so carts that reference them stay valid.
          options: options.map((o, i) => ({
            ...(o.id ? { id: o.id } : {}),
            name_ar: o.name_ar.trim(),
            name_en: o.name_en.trim(),
            price: Math.round(Number(o.price) * 1000) / 1000,
            sku: o.sku.trim() || null,
            is_active: o.is_active,
            rank: o.rank === "" ? i : Number(o.rank),
          })),
        },
      }),
    onSuccess: () => {
      toast.success("تم الحفظ")
      queryClient.invalidateQueries({ queryKey: [ENDPOINT] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content className="max-w-3xl">
        <Drawer.Header>
          <Drawer.Title>{group ? "تعديل مجموعة" : "مجموعة قطع إضافية جديدة"}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-5 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                الاسم (عربي) *
              </Label>
              <Input
                placeholder="ترقية الرام"
                value={values.name_ar}
                onChange={(e) => setValues({ ...values, name_ar: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                Name (English) *
              </Label>
              <Input
                dir="ltr"
                placeholder="RAM upgrade"
                value={values.name_en}
                onChange={(e) => setValues({ ...values, name_en: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                النوع
              </Label>
              <Select value={values.kind} onValueChange={(v) => setValues({ ...values, kind: v })}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {ADDON_KINDS.map((k) => (
                    <Select.Item key={k.value} value={k.value}>
                      {k.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                طريقة الاختيار
              </Label>
              <Select
                value={values.selection}
                onValueChange={(v) => setValues({ ...values, selection: v as AddonGroup["selection"] })}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="single">خيار واحد</Select.Item>
                  <Select.Item value="multiple">أكثر من خيار</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                الترتيب
              </Label>
              <Input type="number" value={values.rank} onChange={(e) => setValues({ ...values, rank: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={values.is_required}
                onCheckedChange={(v) => setValues({ ...values, is_required: v })}
              />
              إلزامي (لا يمكن الشراء بدون اختيار)
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label size="small" weight="plus">
                الخيارات (السعر يضاف لسعر المنتج بالدينار)
              </Label>
              <Button
                size="small"
                variant="secondary"
                onClick={() =>
                  setOptions((s) => [
                    ...s,
                    { name_ar: "", name_en: "", price: "", sku: "", is_active: true, rank: String(s.length) },
                  ])
                }
              >
                إضافة خيار
              </Button>
            </div>
            {options.map((o, i) => (
              <div key={o.id ?? `new-${i}`} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-ui-border-base p-3 md:grid-cols-6">
                <Input placeholder="16 جيجا" value={o.name_ar} onChange={(e) => update(i, { name_ar: e.target.value })} />
                <Input dir="ltr" placeholder="16GB" value={o.name_en} onChange={(e) => update(i, { name_en: e.target.value })} />
                <Input
                  dir="ltr"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={o.price}
                  onChange={(e) => update(i, { price: e.target.value })}
                />
                <Input dir="ltr" placeholder="SKU" value={o.sku} onChange={(e) => update(i, { sku: e.target.value })} />
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={o.is_active} onCheckedChange={(v) => update(i, { is_active: v })} />
                  متاح
                </label>
                <Button size="small" variant="transparent" onClick={() => setOptions((s) => s.filter((_, j) => j !== i))}>
                  حذف
                </Button>
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

export const AddonGroupsTab = () => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<AddonGroup | "new" | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: [ENDPOINT],
    queryFn: () => sdk.client.fetch<{ addon_groups: AddonGroup[] }>(ENDPOINT),
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
          <Heading level="h2">القطع الإضافية</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            مجموعات مثل ترقية الرام أو SSD أو هارد المراقبة. فعّلها لكل منتج من صفحة المنتج.
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
              <Table.HeaderCell>المجموعة</Table.HeaderCell>
              <Table.HeaderCell>النوع</Table.HeaderCell>
              <Table.HeaderCell>الخيارات</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data?.addon_groups ?? []).map((g) => (
              <Table.Row key={g.id}>
                <Table.Cell>
                  {g.name_ar} {g.is_required && <Badge size="2xsmall">إلزامي</Badge>}
                </Table.Cell>
                <Table.Cell>{ADDON_KINDS.find((k) => k.value === g.kind)?.label ?? g.kind}</Table.Cell>
                <Table.Cell>
                  {g.options.map((o) => `${o.name_ar} ${formatKwd(o.price)}`).join("، ") || "—"}
                </Table.Cell>
                <Table.Cell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button size="small" variant="transparent" onClick={() => setEditing(g)}>
                      تعديل
                    </Button>
                    <Button
                      size="small"
                      variant="transparent"
                      onClick={() => window.confirm("حذف المجموعة من كل المنتجات؟") && remove.mutate(g.id)}
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
        <GroupDrawer
          key={editing === "new" ? "new" : editing.id}
          group={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Container>
  )
}
