# AI costs: measurement and optimisation

## How it is measured
- **Live:** every paid AI request (assistant, product drafts, image edits, videos) is recorded in `ai_usage`:
  - task, model, tokens in/out/cached;
  - the provider-reported cost (OpenRouter credits = USD; Anthropic reports tokens only);
  - the characters we sent, duration, tool calls and status.
  - No prompts or answers are stored.
- **Where to see it:** admin → المساعد الذكي shows today, this month, per task, and the most expensive runs.
  `GET /admin/ai/usage` returns the same data.
- **Repeatable baseline:** `integration-tests/http/ai-baseline.spec.ts` runs fixed scenarios through the real code,
  with a scripted model in place of OpenRouter, and prints `AI_BASELINE {...}`.
  - "approx tokens" there is characters ÷ 4 (the fake model's count).
  - Use it to compare versions, not as a price.
  - **Assistant:** 4 questions in one conversation (best sellers, TP-Link routers, Archer AX55 details, raise TP-Link
    prices 5%) over 40 products and 30 orders.
  - **Product:** draft from a realistic manufacturer page (menus, scripts, 400 nav links, related products, footer)
    with no category chosen and a specs template on the category, then one "update with answers".

## Baseline (before optimisation, commit with this file)
| Scenario | Requests | Characters sent | Largest request | ≈ input tokens |
|---|---:|---:|---:|---:|
| Assistant, 4 questions | 9 | 106,211 | 20,346 | 26,557 |
| Product draft + 1 update | 4 | 134,704 | 33,798 | 33,678 |

Where it comes from (from the code):
- **Assistant:**
  - Every request resends the whole conversation, including old tool results: product lists and the sales summary.
  - Each turn makes 2–3 requests, each repeating everything before it.
- **Product:**
  - The extracted page text (menus, related products and footer included) is sent in full.
  - It is sent twice per draft: once to pick the category, then again with that category's spec fields.
  - "Update with answers" fetches the page and does both calls again.
