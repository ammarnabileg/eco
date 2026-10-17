import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Label, Select, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { sdk } from "../../lib/sdk"

type Status = {
  configured: boolean
  environment: string
  connection: {
    realm_id: string
    company_name: string | null
    environment: string
    currency: string
    income_account_id: string | null
    deposit_account_id: string | null
    refresh_expires_at: string | null
    connected_at: string
  } | null
  synced_count: number
  failed_count: number
  failed: { id: string; entity: string; local_id: string; error: string | null; attempts: number; updated_at: string }[]
}
type Account = { id: string; name: string; type: string; currency: string | null }

const ENTITY_LABEL: Record<string, string> = {
  order: "طلب",
  variant: "منتج",
  customer: "عميل",
  refund: "استرجاع",
  payment_method: "طريقة دفع",
  capture: "تحصيل دفعة",
}

const QuickbooksPage = () => {
  const queryClient = useQueryClient()
  const { data: status, isLoading } = useQuery({
    queryKey: ["quickbooks"],
    queryFn: () => sdk.client.fetch<Status>("/admin/quickbooks"),
  })
  const connected = Boolean(status?.connection)
  const { data: accounts } = useQuery({
    queryKey: ["quickbooks", "accounts"],
    queryFn: () => sdk.client.fetch<{ income: Account[]; deposit: Account[] }>("/admin/quickbooks/accounts"),
    enabled: connected,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("connected")) toast.success("تم ربط QuickBooks")
    if (params.get("error")) toast.error(`تعذر الربط: ${params.get("error")}`)
  }, [])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["quickbooks"] })
  const connect = useMutation({
    mutationFn: () => sdk.client.fetch<{ url: string }>("/admin/quickbooks/connect", { method: "POST" }),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const disconnect = useMutation({
    mutationFn: () => sdk.client.fetch("/admin/quickbooks/disconnect", { method: "POST" }),
    onSuccess: () => {
      toast.success("تم فصل QuickBooks")
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const [income, setIncome] = useState<string | undefined>()
  const [deposit, setDeposit] = useState<string | undefined>()
  useEffect(() => {
    setIncome(status?.connection?.income_account_id ?? undefined)
    setDeposit(status?.connection?.deposit_account_id ?? undefined)
  }, [status?.connection?.income_account_id, status?.connection?.deposit_account_id])
  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/quickbooks/settings", {
        method: "POST",
        body: { income_account_id: income ?? null, deposit_account_id: deposit ?? null },
      }),
    onSuccess: () => {
      toast.success("تم الحفظ")
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const retry = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ results: { ok: boolean }[] }>("/admin/quickbooks/sync", {
        method: "POST",
        body: { retry_failed: true },
      }),
    onSuccess: ({ results }) => {
      toast.success(`تمت إعادة المحاولة: ${results.filter((r) => r.ok).length} من ${results.length} نجحت`)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !status) {
    return <Container>جاري التحميل…</Container>
  }

  return (
    <div className="flex flex-col gap-4">
      <Container className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Heading level="h1">QuickBooks Online</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              كل منتج يُضاف كـ Item، وكل طلب مدفوع كـ Sales Receipt (وغير المدفوع كـ Invoice)، وكل استرجاع كـ Refund
              Receipt. المتجر هو المرجع: التعديل في QuickBooks لا يرجع للمتجر.
            </Text>
          </div>
          {connected ? (
            <Button variant="danger" size="small" isLoading={disconnect.isPending} onClick={() => window.confirm("فصل QuickBooks؟ ستتوقف المزامنة.") && disconnect.mutate()}>
              فصل
            </Button>
          ) : (
            <Button size="small" disabled={!status.configured} isLoading={connect.isPending} onClick={() => connect.mutate()}>
              ربط QuickBooks
            </Button>
          )}
        </div>
        {!status.configured && (
          <Text size="small" className="text-ui-fg-error">
            أضف QUICKBOOKS_CLIENT_ID و QUICKBOOKS_CLIENT_SECRET و QUICKBOOKS_ENCRYPTION_KEY في إعدادات السيرفر أولاً.
          </Text>
        )}
        {status.connection && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label size="small">الشركة</Label>
              <Text>
                {status.connection.company_name ?? "—"} <Badge size="2xsmall">{status.connection.environment}</Badge>
              </Text>
            </div>
            <div>
              <Label size="small">العملة</Label>
              <Text>{status.connection.currency}</Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                QuickBooks يحفظ المبالغ بخانتين عشريتين: الفلس الثالث يُقرّب ويُذكر في ملاحظة القيد.
              </Text>
            </div>
            <div>
              <Label size="small">تم ترحيله</Label>
              <Text>{status.synced_count}</Text>
            </div>
            <div>
              <Label size="small">صلاحية الربط حتى</Label>
              <Text>{status.connection.refresh_expires_at ? new Date(status.connection.refresh_expires_at).toLocaleDateString("ar-KW") : "—"}</Text>
            </div>
          </div>
        )}
      </Container>

      {connected && (
        <Container className="flex flex-col gap-4">
          <Heading level="h2">الحسابات</Heading>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label size="small">حساب إيراد المبيعات</Label>
              <Select value={income} onValueChange={setIncome}>
                <Select.Trigger>
                  <Select.Value placeholder="اختر الحساب" />
                </Select.Trigger>
                <Select.Content>
                  {(accounts?.income ?? []).map((a) => (
                    <Select.Item key={a.id} value={a.id}>
                      {a.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label size="small">حساب استلام المدفوعات</Label>
              <Select value={deposit} onValueChange={setDeposit}>
                <Select.Trigger>
                  <Select.Value placeholder="اختر الحساب" />
                </Select.Trigger>
                <Select.Content>
                  {(accounts?.deposit ?? []).map((a) => (
                    <Select.Item key={a.id} value={a.id}>
                      {a.name} {a.currency ? `(${a.currency})` : ""}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Text size="xsmall" className="text-ui-fg-muted">
                Undeposited Funds مناسب لمدفوعات كي نت والبطاقات وTaly وDeema لحين تسويتها في البنك.
              </Text>
            </div>
          </div>
          <div>
            <Button size="small" variant="secondary" isLoading={save.isPending} onClick={() => save.mutate()}>
              حفظ
            </Button>
          </div>
        </Container>
      )}

      {connected && (
        <Container className="flex flex-col gap-3 p-0">
          <div className="flex items-center justify-between px-6 pt-4">
            <div>
              <Heading level="h2">لم يتم ترحيلها ({status.failed_count})</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                يعاد المحاولة تلقائياً كل 15 دقيقة (حتى 6 مرات).
              </Text>
            </div>
            <Button size="small" variant="secondary" disabled={!status.failed_count} isLoading={retry.isPending} onClick={() => retry.mutate()}>
              إعادة محاولة الطلبات
            </Button>
          </div>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>النوع</Table.HeaderCell>
                <Table.HeaderCell>المعرف</Table.HeaderCell>
                <Table.HeaderCell>الخطأ</Table.HeaderCell>
                <Table.HeaderCell>المحاولات</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {status.failed.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell>{ENTITY_LABEL[r.entity] ?? r.entity}</Table.Cell>
                  <Table.Cell>
                    {r.entity === "order" ? <a className="text-ui-fg-interactive" href={`/app/orders/${r.local_id}`}>{r.local_id}</a> : r.local_id}
                  </Table.Cell>
                  <Table.Cell className="max-w-[420px] whitespace-normal text-xs" dir="ltr">
                    {r.error}
                  </Table.Cell>
                  <Table.Cell>{r.attempts}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Container>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "QuickBooks",
  icon: CurrencyDollar,
})

export default QuickbooksPage
