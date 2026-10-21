// Totals of recorded AI usage for the admin: today, this month, per task and
// model, and the most expensive runs. Pure, unit-tested.

export type UsageRecord = {
  run_id: string
  task: string
  model: string
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  cost_usd: number | null
  request_chars: number
  status: string
  created_at: Date | string
}

type Totals = { requests: number; input_tokens: number; output_tokens: number; cached_tokens: number; cost_usd: number; unpriced: number; errors: number }

const empty = (): Totals => ({ requests: 0, input_tokens: 0, output_tokens: 0, cached_tokens: 0, cost_usd: 0, unpriced: 0, errors: 0 })

const add = (t: Totals, r: UsageRecord) => {
  t.requests++
  t.input_tokens += r.input_tokens
  t.output_tokens += r.output_tokens
  t.cached_tokens += r.cached_tokens
  if (typeof r.cost_usd === "number") t.cost_usd += r.cost_usd
  else t.unpriced++
  if (r.status !== "ok") t.errors++
}

/** Start of the day in Kuwait (UTC+3), as a UTC instant. */
export const kuwaitDayStart = (now = Date.now()) => {
  const k = new Date(now + 3 * 3600 * 1000)
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - 3 * 3600 * 1000)
}

export const kuwaitMonthStart = (now = Date.now()) => {
  const k = new Date(now + 3 * 3600 * 1000)
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1) - 3 * 3600 * 1000)
}

export function summarizeUsage(rows: UsageRecord[], now = Date.now()) {
  const today = kuwaitDayStart(now).getTime()
  const totals = { today: empty(), month: empty() }
  const byTask = new Map<string, Totals>()
  const byModel = new Map<string, Totals>()
  const runs = new Map<string, Totals & { run_id: string; task: string; model: string; at: string; max_input_tokens: number }>()

  for (const r of rows) {
    const at = new Date(r.created_at).getTime()
    add(totals.month, r)
    if (at >= today) add(totals.today, r)
    if (!byTask.has(r.task)) byTask.set(r.task, empty())
    add(byTask.get(r.task)!, r)
    if (!byModel.has(r.model)) byModel.set(r.model, empty())
    add(byModel.get(r.model)!, r)
    if (!runs.has(r.run_id)) {
      runs.set(r.run_id, { ...empty(), run_id: r.run_id, task: r.task, model: r.model, at: new Date(r.created_at).toISOString(), max_input_tokens: 0 })
    }
    const run = runs.get(r.run_id)!
    add(run, r)
    run.max_input_tokens = Math.max(run.max_input_tokens, r.input_tokens)
  }

  const round = <T extends Totals>(t: T) => ({ ...t, cost_usd: Number(t.cost_usd.toFixed(6)) })
  return {
    today: round(totals.today),
    month: round(totals.month),
    by_task: [...byTask.entries()].map(([task, t]) => ({ task, ...round(t) })).sort((a, b) => b.cost_usd - a.cost_usd),
    by_model: [...byModel.entries()].map(([model, t]) => ({ model, ...round(t) })).sort((a, b) => b.cost_usd - a.cost_usd),
    // Ranked by cost, then by input size when a provider reports no cost.
    expensive_runs: [...runs.values()]
      .map(round)
      .sort((a, b) => b.cost_usd - a.cost_usd || b.input_tokens - a.input_tokens)
      .slice(0, 10),
  }
}
