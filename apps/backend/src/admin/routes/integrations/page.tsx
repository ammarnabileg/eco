import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PuzzleSolid } from "@medusajs/icons"
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
  Tabs,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { sdk } from "../../lib/sdk"

type Field = {
  key: string
  label: string
  type: "text" | "secret" | "select" | "multiselect"
  help: string | null
  placeholder: string | null
  options: { value: string; label: string }[] | null
  required: boolean
  public: boolean
  source: "admin" | "server" | "default" | null
  has_value: boolean
  value: string | string[] | null
}

type Integration = {
  key: string
  name: string
  group: "payments" | "accounting" | "messaging" | "marketing"
  description: string
  docs: string | null
  enabled: boolean
  active: boolean
  missing: string[]
  fields: Field[]
}

type Response = { integrations: Integration[]; urls: Record<string, string> }

const GROUPS = [
  { key: "payments", label: "الدفع" },
  { key: "accounting", label: "المحاسبة" },
  { key: "messaging", label: "واتساب" },
  { key: "marketing", label: "التسويق والتحليلات" },
] as const

// Addresses each provider needs in its own dashboard.
const PROVIDER_URLS: Record<string, { label: string; key: string }[]> = {
  klickpay: [{ label: "رابط الـ Webhook", key: "klickpay_webhook" }],
  taly: [{ label: "رابط الـ Webhook (بيتبعت تلقائياً مع كل طلب)", key: "taly_webhook" }],
  deema: [{ label: "رابط الـ Webhook", key: "deema_webhook" }],
  quickbooks: [
    { label: "Redirect URI (Keys & credentials ← Redirect URIs)", key: "quickbooks_redirect" },
    { label: "Webhook endpoint (Webhooks ← Endpoint URL)", key: "quickbooks_webhook" },
  ],
  google_merchant: [
    { label: "Feed عربي", key: "google_feed_ar" },
    { label: "Feed إنجليزي", key: "google_feed_en" },
  ],
}

const SOURCE_LABEL: Record<string, string> = {
  server: "من إعدادات السيرفر",
  default: "القيمة الافتراضية",
}

function StatusBadge({ item }: { item: Integration }) {
  if (item.active) return <Badge color="green" size="2xsmall">مفعّل</Badge>
  if (item.enabled) return <Badge color="orange" size="2xsmall">ناقص بيانات</Badge>
  return <Badge color="grey" size="2xsmall">متوقف</Badge>
}

// WhatsApp only: point Evolution's webhook at the store, and send a test.
function WhatsappTools({ active }: { active: boolean }) {
  const [phone, setPhone] = useState("")
  const webhook = useMutation({
    mutationFn: () => sdk.client.fetch<{ url: string }>("/admin/whatsapp/webhook", { method: "POST" }),
    onSuccess: ({ url }) => toast.success(`تم ضبط الـ Webhook على ${url}`),
    onError: (e: Error) => toast.error(e.message),
  })
  const test = useMutation({
    mutationFn: () => sdk.client.fetch("/admin/whatsapp/send-test", { method: "POST", body: { phone } }),
    onSuccess: () => toast.success("تم إرسال رسالة التجربة"),
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <div className="flex flex-col gap-3 rounded-md border border-ui-border-base p-3">
      <Text size="small" className="text-ui-fg-subtle">
        بعد الحفظ والتفعيل: اضبط الـ Webhook علشان ردود العملاء (1 للتأكيد / 2 للإلغاء) توصل للمتجر، وجرّب الإرسال.
      </Text>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="small" variant="secondary" disabled={!active} isLoading={webhook.isPending} onClick={() => webhook.mutate()}>
          ضبط الـ Webhook تلقائياً
        </Button>
        <Input
          dir="ltr"
          className="w-48"
          placeholder="+965 5000 0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button size="small" variant="secondary" disabled={!active || !phone} isLoading={test.isPending} onClick={() => test.mutate()}>
          إرسال رسالة تجربة
        </Button>
      </div>
    </div>
  )
}

function IntegrationCard({ item, urls }: { item: Integration; urls: Record<string, string> }) {
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(item.enabled)
  const [values, setValues] = useState<Record<string, string | string[] | null>>({})

  useEffect(() => {
    setEnabled(item.enabled)
    setValues({})
  }, [item])

  const valueOf = (f: Field) => (f.key in values ? values[f.key] : f.type === "secret" ? "" : f.value)
  const set = (key: string, value: string | string[] | null) => setValues((v) => ({ ...v, [key]: value }))

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/integrations/${item.key}`, {
        method: "POST",
        body: { enabled, values },
      }),
    onSuccess: () => {
      toast.success(`تم حفظ ${item.name}`)
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const dirty = enabled !== item.enabled || Object.keys(values).length > 0

  return (
    <Container className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Heading level="h2">{item.name}</Heading>
            <StatusBadge item={item} />
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {item.description}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Label size="small" htmlFor={`enabled-${item.key}`}>
            تفعيل
          </Label>
          <Switch id={`enabled-${item.key}`} checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {item.fields.map((f) => {
          const v = valueOf(f)
          return (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label size="small" htmlFor={`${item.key}-${f.key}`}>
                {f.label}
                {f.required ? " *" : ""}
              </Label>
              {f.type === "select" ? (
                <Select value={(v as string) ?? undefined} onValueChange={(x) => set(f.key, x)}>
                  <Select.Trigger id={`${item.key}-${f.key}`}>
                    <Select.Value placeholder="اختر" />
                  </Select.Trigger>
                  <Select.Content>
                    {(f.options ?? []).map((o) => (
                      <Select.Item key={o.value} value={o.value}>
                        {o.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              ) : f.type === "multiselect" ? (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {(f.options ?? []).map((o) => {
                    const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []
                    return (
                      <label key={o.value} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={list.includes(o.value)}
                          onCheckedChange={(on) =>
                            set(f.key, on ? [...list, o.value] : list.filter((x) => x !== o.value))
                          }
                        />
                        {o.label}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id={`${item.key}-${f.key}`}
                    dir="ltr"
                    type={f.type === "secret" ? "password" : "text"}
                    autoComplete="off"
                    value={(v as string) ?? ""}
                    placeholder={
                      f.type === "secret" && f.has_value ? "•••••• محفوظ (اكتب قيمة جديدة لتغييره)" : (f.placeholder ?? "")
                    }
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                  {f.type === "secret" && f.source === "admin" && (
                    <Button
                      size="small"
                      variant="secondary"
                      type="button"
                      onClick={() => set(f.key, null)}
                      disabled={values[f.key] === null}
                    >
                      حذف
                    </Button>
                  )}
                </div>
              )}
              {(f.help || (f.source && SOURCE_LABEL[f.source])) && (
                <Text size="xsmall" className="text-ui-fg-muted">
                  {[f.source ? SOURCE_LABEL[f.source] : null, f.help].filter(Boolean).join(" · ")}
                </Text>
              )}
            </div>
          )
        })}
      </div>

      {item.key === "whatsapp" && <WhatsappTools active={item.active} />}

      {(PROVIDER_URLS[item.key] ?? []).map((u) => (
        <div key={u.key} className="flex flex-col gap-1">
          <Label size="small">{u.label}</Label>
          <code dir="ltr" className="bg-ui-bg-subtle rounded px-2 py-1 text-xs break-all">
            {urls[u.key]}
          </code>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <div>
          {item.key === "quickbooks" && item.active && (
            <a href="/app/quickbooks" className="text-ui-fg-interactive text-sm">
              ربط شركة QuickBooks ←
            </a>
          )}
        </div>
        <Button size="small" isLoading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
          حفظ
        </Button>
      </div>
    </Container>
  )
}

const IntegrationsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => sdk.client.fetch<Response>("/admin/integrations"),
  })

  if (isLoading || !data) {
    return <Container>جاري التحميل…</Container>
  }

  return (
    <div className="flex flex-col gap-4">
      <Container>
        <Heading level="h1">التكاملات</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          مفاتيح بوابات الدفع والمحاسبة وأدوات التسويق. المفاتيح السرية بتتحفظ مشفّرة ومش بتظهر تاني بعد الحفظ.
          التغيير بيشتغل خلال ثواني من غير إعادة تشغيل. تفعيل بوابة دفع بيضيفها لصفحة الدفع في الكويت تلقائياً.
        </Text>
      </Container>
      <Tabs defaultValue="payments">
        <Tabs.List>
          {GROUPS.map((g) => (
            <Tabs.Trigger key={g.key} value={g.key}>
              {g.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {GROUPS.map((g) => (
          <Tabs.Content key={g.key} value={g.key} className="mt-4 flex flex-col gap-4">
            {data.integrations
              .filter((i) => i.group === g.key)
              .map((i) => (
                <IntegrationCard key={i.key} item={i} urls={data.urls} />
              ))}
          </Tabs.Content>
        ))}
      </Tabs>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "التكاملات",
  icon: PuzzleSolid,
})

export default IntegrationsPage
