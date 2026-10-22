import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowUturnLeft } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Select, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { sdk } from "../../lib/sdk"

type AfterSalesRequest = {
  id: string
  kind: "return" | "exchange" | "warranty"
  order_id: string
  order_display_id: number
  customer_id: string | null
  items: { line_item_id: string; title: string; quantity: number }[]
  reason: string
  details: string | null
  phone: string
  status: string
  admin_note: string | null
  locale: string
  created_at: string
}

const ENDPOINT = "/admin/after-sales-requests"
const PAGE = 25
const ALL = "__all"

const KINDS = [
  { value: "return", label: "إرجاع" },
  { value: "exchange", label: "استبدال" },
  { value: "warranty", label: "ضمان" },
]
const STATUSES = [
  { value: "new", label: "جديد" },
  { value: "reviewing", label: "قيد المراجعة" },
  { value: "approved", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
  { value: "received", label: "تم الاستلام" },
  { value: "completed", label: "مكتمل" },
]
const REASONS: Record<string, string> = {
  defective: "عيب في المنتج",
  wrong_item: "منتج خاطئ",
  not_as_described: "غير مطابق للوصف",
  changed_mind: "غيّر رأيه",
  other: "سبب آخر",
}
const label = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v

// Digits only, with Kuwait's code added to 8-digit local numbers.
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 8 ? `965${digits}` : digits
}

const NoteCell = ({ row, onSave }: { row: AfterSalesRequest; onSave: (note: string) => void }) => {
  const [note, setNote] = useState(row.admin_note ?? "")
  return (
    <Input
      size="small"
      value={note}
      placeholder="ملاحظة"
      onChange={(e) => setNote(e.target.value)}
      onBlur={() => note !== (row.admin_note ?? "") && onSave(note)}
    />
  )
}

const FilterSelect = ({
  value,
  onChange,
  all,
  options,
}: {
  value: string
  onChange: (v: string) => void
  all: string
  options: { value: string; label: string }[]
}) => (
  <Select value={value} onValueChange={onChange}>
    <Select.Trigger>
      <Select.Value />
    </Select.Trigger>
    <Select.Content>
      <Select.Item value={ALL}>{all}</Select.Item>
      {options.map((s) => (
        <Select.Item key={s.value} value={s.value}>
          {s.label}
        </Select.Item>
      ))}
    </Select.Content>
  </Select>
)

const AfterSalesPage = () => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(ALL)
  const [kind, setKind] = useState(ALL)
  const [q, setQ] = useState("")
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: [ENDPOINT, status, kind, q, offset],
    queryFn: () =>
      sdk.client.fetch<{ after_sales_requests: AfterSalesRequest[]; count: number }>(ENDPOINT, {
        query: {
          limit: PAGE,
          offset,
          ...(status !== ALL ? { status } : {}),
          ...(kind !== ALL ? { kind } : {}),
          ...(q.trim() ? { q: q.trim() } : {}),
        },
      }),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      sdk.client.fetch(`${ENDPOINT}/${id}`, { method: "POST", body }),
    onSuccess: () => {
      toast.success("تم التحديث")
      queryClient.invalidateQueries({ queryKey: [ENDPOINT] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const count = data?.count ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h2">طلبات ما بعد البيع</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            طلبات الإرجاع والاستبدال والضمان من صفحة «الإرجاع والضمان». الطلب لا يُنشئ إرجاعاً ولا استرداداً تلقائياً: راجعه
            مع العميل، وإذا قررتم الإرجاع أو الاسترداد فنفّذوه من صفحة الطلب ثم حدّثوا الحالة هنا.
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-36">
            <Input
              size="small"
              placeholder="رقم الطلب"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setOffset(0)
              }}
            />
          </div>
          <div className="w-36">
            <FilterSelect
              value={kind}
              all="كل الأنواع"
              options={KINDS}
              onChange={(v) => {
                setKind(v)
                setOffset(0)
              }}
            />
          </div>
          <div className="w-40">
            <FilterSelect
              value={status}
              all="كل الحالات"
              options={STATUSES}
              onChange={(v) => {
                setStatus(v)
                setOffset(0)
              }}
            />
          </div>
        </div>
      </div>
      {isLoading ? (
        <Text className="px-6 py-4">جاري التحميل…</Text>
      ) : !count ? (
        <Text className="px-6 py-4 text-ui-fg-subtle">لا توجد طلبات.</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>التاريخ</Table.HeaderCell>
              <Table.HeaderCell>النوع</Table.HeaderCell>
              <Table.HeaderCell>الطلب</Table.HeaderCell>
              <Table.HeaderCell>المنتجات</Table.HeaderCell>
              <Table.HeaderCell>السبب والتفاصيل</Table.HeaderCell>
              <Table.HeaderCell>الهاتف</Table.HeaderCell>
              <Table.HeaderCell>الحالة</Table.HeaderCell>
              <Table.HeaderCell>ملاحظة داخلية</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data?.after_sales_requests ?? []).map((r) => (
              <Table.Row key={r.id}>
                <Table.Cell className="whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("ar-KW-u-nu-latn", { dateStyle: "short", timeStyle: "short" })}
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall">{label(KINDS, r.kind)}</Badge>
                  {r.locale !== "ar" && <div className="text-ui-fg-muted">لغة العميل: {r.locale}</div>}
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <a className="text-ui-fg-interactive" href={`/app/orders/${r.order_id}`}>
                    #{r.order_display_id}
                  </a>
                  {!r.customer_id && <div className="text-ui-fg-muted">زائر (تحقق بالواتساب)</div>}
                </Table.Cell>
                <Table.Cell className="max-w-xs whitespace-normal">
                  {(r.items ?? []).map((i) => (
                    <div key={i.line_item_id}>
                      {i.title} × {i.quantity}
                    </div>
                  ))}
                </Table.Cell>
                <Table.Cell className="max-w-xs whitespace-normal">
                  <div className="font-medium">{REASONS[r.reason] ?? r.reason}</div>
                  <div className="text-ui-fg-subtle">{r.details || "—"}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap" dir="ltr">
                  <a className="text-ui-fg-interactive" href={`tel:${r.phone.replace(/\s/g, "")}`}>
                    {r.phone}
                  </a>{" "}
                  ·{" "}
                  <a className="text-ui-fg-interactive" href={`https://wa.me/${waNumber(r.phone)}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </Table.Cell>
                <Table.Cell>
                  <Select size="small" value={r.status} onValueChange={(v) => update.mutate({ id: r.id, body: { status: v } })}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {STATUSES.map((s) => (
                        <Select.Item key={s.value} value={s.value}>
                          {s.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Table.Cell>
                <Table.Cell>
                  <NoteCell row={r} onSave={(note) => update.mutate({ id: r.id, body: { admin_note: note || null } })} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      {count > PAGE && (
        <div className="flex items-center justify-between px-6 py-3">
          <Text size="small" className="text-ui-fg-subtle">
            {offset + 1}–{Math.min(offset + PAGE, count)} من {count}
          </Text>
          <div className="flex gap-2">
            <Button size="small" variant="secondary" disabled={offset === 0} onClick={() => setOffset(offset - PAGE)}>
              السابق
            </Button>
            <Button size="small" variant="secondary" disabled={offset + PAGE >= count} onClick={() => setOffset(offset + PAGE)}>
              التالي
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "طلبات ما بعد البيع",
  icon: ArrowUturnLeft,
})

export default AfterSalesPage
