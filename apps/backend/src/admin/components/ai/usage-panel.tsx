import { Container, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

import { sdk } from "../../lib/sdk"

type Totals = { requests: number; input_tokens: number; output_tokens: number; cached_tokens: number; cost_usd: number; unpriced: number; errors: number }
type Usage = {
  today: Totals
  month: Totals
  by_task: (Totals & { task: string })[]
  by_model: (Totals & { model: string })[]
  expensive_runs: (Totals & { run_id: string; task: string; model: string; at: string; max_input_tokens: number })[]
}

const TASKS: Record<string, string> = {
  admin_chat: "المساعد",
  product_draft: "كتابة منتج",
  product_category: "اختيار قسم",
  image_edit: "تعديل صور",
  image_generate: "توليد صور",
  video: "فيديو",
  marketing_copy: "نص إعلاني",
}

const usd = (n: number) => `$${n < 1 ? n.toFixed(4) : n.toFixed(2)}`
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

/** This month's AI spending as the providers report it (OpenRouter credits = USD). */
export function AiUsagePanel() {
  const { data } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: () => sdk.client.fetch<Usage>("/admin/ai/usage"),
    refetchInterval: 60_000,
  })
  if (!data) return null
  const card = (label: string, t: Totals) => (
    <div className="rounded-md border border-ui-border-base p-3">
      <Text size="xsmall" className="text-ui-fg-muted">
        {label}
      </Text>
      <Text weight="plus" className="text-lg">
        {usd(t.cost_usd)}
      </Text>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {t.requests} طلب · {k(t.input_tokens)} داخل · {k(t.output_tokens)} خارج
        {t.cached_tokens ? ` · ${k(t.cached_tokens)} من الكاش` : ""}
        {t.errors ? ` · ${t.errors} فشل` : ""}
      </Text>
    </div>
  )
  return (
    <Container className="flex flex-col gap-3">
      <Heading level="h2">استهلاك الذكاء الاصطناعي</Heading>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {card("النهارده", data.today)}
        {card("الشهر ده", data.month)}
      </div>
      {data.month.unpriced > 0 && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {data.month.unpriced} طلب من غير تكلفة (Anthropic بيرجّع توكنز بس، والتكلفة بتظهر في حسابك هناك).
        </Text>
      )}
      {data.by_task.length > 0 && (
        <Text size="small">
          {data.by_task.map((t) => `${TASKS[t.task] ?? t.task}: ${usd(t.cost_usd)} (${t.requests})`).join(" · ")}
        </Text>
      )}
      {data.expensive_runs.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm">أغلى العمليات</summary>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>الوقت</Table.HeaderCell>
                <Table.HeaderCell>النوع</Table.HeaderCell>
                <Table.HeaderCell>الموديل</Table.HeaderCell>
                <Table.HeaderCell>طلبات</Table.HeaderCell>
                <Table.HeaderCell>توكنز داخلة</Table.HeaderCell>
                <Table.HeaderCell>أكبر طلب</Table.HeaderCell>
                <Table.HeaderCell>التكلفة</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.expensive_runs.map((r) => (
                <Table.Row key={r.run_id}>
                  <Table.Cell>{new Date(r.at).toLocaleString("ar-KW", { dateStyle: "short", timeStyle: "short" })}</Table.Cell>
                  <Table.Cell>{TASKS[r.task] ?? r.task}</Table.Cell>
                  <Table.Cell>{r.model}</Table.Cell>
                  <Table.Cell>{r.requests}</Table.Cell>
                  <Table.Cell>{k(r.input_tokens)}</Table.Cell>
                  <Table.Cell>{k(r.max_input_tokens)}</Table.Cell>
                  <Table.Cell>{usd(r.cost_usd)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </details>
      )}
    </Container>
  )
}
