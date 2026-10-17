import { Button, Container, Heading, Input, Select, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { QUOTE_STATUSES, QuoteRequest } from "../../lib/catalog"
import { sdk } from "../../lib/sdk"

const ENDPOINT = "/admin/catalog/quote-requests"
const PAGE = 25
const ALL = "__all"

// Digits only, with Kuwait's code added to 8-digit local numbers.
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 8 ? `965${digits}` : digits
}

const NoteCell = ({ row, onSave }: { row: QuoteRequest; onSave: (note: string) => void }) => {
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

export const QuoteRequestsTab = () => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(ALL)
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: [ENDPOINT, status, offset],
    queryFn: () =>
      sdk.client.fetch<{ quote_requests: QuoteRequest[]; count: number }>(ENDPOINT, {
        query: { limit: PAGE, offset, ...(status !== ALL ? { status } : {}) },
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
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h2">طلبات عرض السعر</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            طلبات العملاء على المنتجات المسعّرة عند الطلب. تواصل عبر الواتساب ثم حدّث الحالة.
          </Text>
        </div>
        <div className="w-48">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setOffset(0)
            }}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL}>كل الحالات</Select.Item>
              {QUOTE_STATUSES.map((s) => (
                <Select.Item key={s.value} value={s.value}>
                  {s.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
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
              <Table.HeaderCell>المنتج</Table.HeaderCell>
              <Table.HeaderCell>العميل</Table.HeaderCell>
              <Table.HeaderCell>الهاتف</Table.HeaderCell>
              <Table.HeaderCell>الكمية</Table.HeaderCell>
              <Table.HeaderCell>الرسالة</Table.HeaderCell>
              <Table.HeaderCell>الحالة</Table.HeaderCell>
              <Table.HeaderCell>ملاحظة داخلية</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data?.quote_requests ?? []).map((q) => (
              <Table.Row key={q.id}>
                <Table.Cell className="whitespace-nowrap">
                  {new Date(q.created_at).toLocaleString("ar-KW-u-nu-latn", { dateStyle: "short", timeStyle: "short" })}
                </Table.Cell>
                <Table.Cell>
                  <a className="text-ui-fg-interactive" href={`/app/products/${q.product_id}`}>
                    {q.product_title}
                  </a>
                </Table.Cell>
                <Table.Cell>
                  {q.customer_name}
                  {q.company && <div className="text-ui-fg-muted">{q.company}</div>}
                  {q.email && (
                    <div className="text-ui-fg-muted" dir="ltr">
                      {q.email}
                    </div>
                  )}
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap" dir="ltr">
                  <a className="text-ui-fg-interactive" href={`tel:${q.phone.replace(/\s/g, "")}`}>
                    {q.phone}
                  </a>{" "}
                  ·{" "}
                  <a
                    className="text-ui-fg-interactive"
                    href={`https://wa.me/${waNumber(q.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </Table.Cell>
                <Table.Cell>{q.quantity}</Table.Cell>
                <Table.Cell className="max-w-xs whitespace-normal">{q.message || "—"}</Table.Cell>
                <Table.Cell>
                  <Select
                    size="small"
                    value={q.status}
                    onValueChange={(v) => update.mutate({ id: q.id, body: { status: v } })}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {QUOTE_STATUSES.map((s) => (
                        <Select.Item key={s.value} value={s.value}>
                          {s.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Table.Cell>
                <Table.Cell>
                  <NoteCell row={q} onSave={(note) => update.mutate({ id: q.id, body: { admin_note: note || null } })} />
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
            <Button
              size="small"
              variant="secondary"
              disabled={offset + PAGE >= count}
              onClick={() => setOffset(offset + PAGE)}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}
