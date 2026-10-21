import { kuwaitDayStart, summarizeUsage } from "../summary"

const row = (over: Record<string, unknown>) => ({
  run_id: "r1",
  task: "admin_chat",
  model: "m",
  input_tokens: 0,
  output_tokens: 0,
  cached_tokens: 0,
  cost_usd: 0,
  request_chars: 0,
  status: "ok",
  created_at: new Date("2026-10-21T10:00:00Z"),
  ...over,
})

describe("summarizeUsage", () => {
  const now = Date.parse("2026-10-21T12:00:00Z")

  it("splits today from the month in Kuwait time and adds up cost per task, model and run", () => {
    const s = summarizeUsage(
      [
        row({ run_id: "a", input_tokens: 1000, cost_usd: 0.01 }),
        row({ run_id: "a", input_tokens: 3000, cost_usd: 0.02 }),
        row({ run_id: "b", task: "product_draft", model: "x", input_tokens: 20000, cost_usd: 0.05 }),
        // 23:30 UTC on the 20th is 02:30 on the 21st in Kuwait: today.
        row({ run_id: "c", created_at: new Date("2026-10-20T23:30:00Z"), cost_usd: 0.001 }),
        row({ run_id: "d", created_at: new Date("2026-10-20T20:00:00Z"), cost_usd: 1 }),
        row({ run_id: "e", cost_usd: null, status: "error" }),
      ],
      now
    )
    expect(s.month.requests).toBe(6)
    expect(s.today.requests).toBe(5)
    expect(s.today.cost_usd).toBeCloseTo(0.081)
    expect(s.month.unpriced).toBe(1)
    expect(s.month.errors).toBe(1)
    expect(s.by_task.map((t) => t.task)).toEqual(["admin_chat", "product_draft"])
    expect(s.expensive_runs[0]).toMatchObject({ run_id: "d", cost_usd: 1 })
    expect(s.expensive_runs.find((r) => r.run_id === "a")).toMatchObject({ requests: 2, input_tokens: 4000, max_input_tokens: 3000 })
  })

  it("starts the Kuwait day at 21:00 UTC", () => {
    expect(kuwaitDayStart(now).toISOString()).toBe("2026-10-20T21:00:00.000Z")
  })
})
