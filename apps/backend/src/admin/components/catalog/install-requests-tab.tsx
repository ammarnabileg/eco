import { Button, Container, Heading, Input, Select, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { INSTALL_SERVICES, INSTALL_STATUSES, InstallRequest } from "../../lib/catalog"
import { sdk } from "../../lib/sdk"

const ENDPOINT = "/admin/catalog/install-requests"
const PAGE = 25
const ALL = "__all"

// Digits only, with Kuwait's code added to 8-digit local numbers.
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 8 ? `965${digits}` : digits
}

const NoteCell = ({ row, onSave }: { row: InstallRequest; onSave: (note: string) => void }) => {
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

export const InstallRequestsTab = () => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(ALL)
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: [ENDPOINT, status, offset],
    queryFn: () =>
      sdk.client.fetch<{ install_requests: InstallRequest[]; count: number }>(ENDPOINT, {
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
          <Heading level="h2">طلبات التركيب</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            حجوزات التركيب من صفحة «خدمة التركيب». الموعد المفضّل اقتراح من العميل: أكّده معه على الواتساب ثم حدّث الحالة.
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
              {INSTALL_STATUSES.map((s) => (
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
              <Table.HeaderCell>الخدمة</Table.HeaderCell>
              <Table.HeaderCell>العميل</Table.HeaderCell>
              <Table.HeaderCell>الهاتف</Table.HeaderCell>
              <Table.HeaderCell>المنطقة</Table.HeaderCell>
              <Table.HeaderCell>الموعد المفضّل</Table.HeaderCell>
              <Table.HeaderCell>الرسالة</Table.HeaderCell>
              <Table.HeaderCell>الحالة</Table.HeaderCell>
              <Table.HeaderCell>ملاحظة داخلية</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data?.install_requests ?? []).map((q) => (
              <Table.Row key={q.id}>
                <Table.Cell className="whitespace-nowrap">
                  {new Date(q.created_at).toLocaleString("ar-KW-u-nu-latn", { dateStyle: "short", timeStyle: "short" })}
                </Table.Cell>
                <Table.Cell>
                  {INSTALL_SERVICES[q.service] ?? q.service}
                  {q.product_id && (
                    <div>
                      <a className="text-ui-fg-interactive" href={`/app/products/${q.product_id}`}>
                        المنتج
                      </a>
                    </div>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {q.customer_name}
                  {q.locale !== "ar" && <div className="text-ui-fg-muted">لغة العميل: {q.locale}</div>}
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap" dir="ltr">
                  <a className="text-ui-fg-interactive" href={`tel:${q.phone.replace(/\s/g, "")}`}>
                    {q.phone}
                  </a>{" "}
                  ·{" "}
                  <a className="text-ui-fg-interactive" href={`https://wa.me/${waNumber(q.phone)}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </Table.Cell>
                <Table.Cell>
                  {q.governorate}
                  {q.area && <div className="text-ui-fg-muted">{q.area}</div>}
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">{q.preferred_date || "—"}</Table.Cell>
                <Table.Cell className="max-w-xs whitespace-normal">{q.message || "—"}</Table.Cell>
                <Table.Cell>
                  <Select size="small" value={q.status} onValueChange={(v) => update.mutate({ id: q.id, body: { status: v } })}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {INSTALL_STATUSES.map((s) => (
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
