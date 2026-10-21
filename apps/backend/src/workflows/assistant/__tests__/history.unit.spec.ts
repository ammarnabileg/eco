import { compactHistory, toTurns } from "../history"

describe("assistant history", () => {
  const openRouter = [
    { role: "user", content: "وريني راوترات TP-Link" },
    { role: "assistant", content: null, tool_calls: [{ id: "1", type: "function", function: { name: "search_products", arguments: "{}" } }] },
    { role: "tool", tool_call_id: "1", content: JSON.stringify({ products: new Array(30).fill({ id: "prod_x", title: "Archer" }) }) },
    { role: "assistant", content: "لقيت 15 راوتر." },
    { role: "user", content: "زوّد أسعارهم 5%" },
    { role: "assistant", content: "جهزت التعديل." },
  ]
  const anthropic = [
    { role: "user", content: "أكتر منتج مبيعاً؟" },
    {
      role: "assistant",
      content: [
        { type: "thinking", thinking: "", signature: "sig" },
        { type: "tool_use", id: "t1", name: "sales_summary", input: {} },
      ],
    },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "{\"orders\": 30}" }] },
    { role: "assistant", content: [{ type: "text", text: "Tapo C200 الأكتر مبيعاً." }] },
  ]

  it("keeps the questions and written answers and drops tool calls, results and reasoning", () => {
    expect(toTurns(openRouter)).toEqual([
      { user: "وريني راوترات TP-Link", assistant: "لقيت 15 راوتر." },
      { user: "زوّد أسعارهم 5%", assistant: "جهزت التعديل." },
    ])
    expect(toTurns(anthropic)).toEqual([{ user: "أكتر منتج مبيعاً؟", assistant: "Tapo C200 الأكتر مبيعاً." }])
    expect(JSON.stringify(compactHistory(openRouter, 10))).not.toContain("prod_x")
  })

  it("keeps only the latest turns, and compacting twice changes nothing", () => {
    const once = compactHistory(openRouter, 1)
    expect(once).toEqual([
      { role: "user", content: "زوّد أسعارهم 5%" },
      { role: "assistant", content: "جهزت التعديل." },
    ])
    expect(compactHistory(once, 1)).toEqual(once)
    expect(compactHistory(openRouter, 0)).toEqual([])
  })

  it("marks a turn that never got an answer", () => {
    expect(compactHistory([{ role: "user", content: "سؤال" }], 5)[1]).toEqual({ role: "assistant", content: "(لم يكتمل الرد)" })
  })
})
