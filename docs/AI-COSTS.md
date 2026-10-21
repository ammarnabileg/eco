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

## Phase 2: assistant context
- **Earlier questions go back as plain text:** the staff message and the written answer. Their tool calls, tool
  results and reasoning are dropped (`workflows/assistant/history.ts`).
- **Only the last N questions are sent:** `history_turns`, default 6.
- **At most N model requests per question:** `max_steps`, default 4 (was 10). The last one is sent with
  `tool_choice: none`, so it answers with what it found instead of stopping silently.
- **A repeated identical tool call in the same question** is answered from the first result.
- **Smaller tool results:** search results drop handles and "Default" variant titles; product descriptions are cut
  at 800 characters; each tool result is capped at 8,000 characters (was 20,000).
- **Bulk price change:** "raise all TP-Link routers 5%" stays one `adjust_prices` proposal. It lists every
  matching variant with its new price, fixed when proposed, and completes within the 4 steps (checked in the
  baseline test).

| Scenario | Requests | Characters sent | Largest request | ≈ input tokens |
|---|---:|---:|---:|---:|
| Assistant, 4 questions — before | 9 | 106,211 | 20,346 | 26,557 |
| Assistant, 4 questions — after | 9 | 67,091 | 11,897 | 16,776 |

**Result:** −37% characters sent, and −42% for the largest request.

About 47,000 of the remaining 67,000 characters are the system instructions and the tool definitions (5.2k per
request), which every request needs. They are the identical start of every request, the part providers cache
automatically. Whether and how much OpenRouter's DeepSeek caches them shows in `cached_tokens` in the usage table
after deployment; the scripted test cannot measure it.

## Phase 3: product drafts
- **The page reader sends a focused text** (`focusedText` in `workflows/ai-product/source.ts`), at most 12,000
  characters, in this order:
  1. schema.org Product data (JSON-LD);
  2. specification tables and definition lists as "key: value" lines;
  3. the readable main text.
  - Left out: menus, header, footer, related products, sidebars, cookie banners, scripts, and repeated lines.
  - The whole source sent to the model is capped at 30,000 characters (was 80,000).
- **Choosing the category is a small separate request** (`product_category`): product name, page title, the first
  1,500 characters, and the category list. The page is then written up once, with that category's spec fields.
  Before, it was written up twice.
- **The draft returns its `source_text`.** "Update with answers" sends it back with the chosen category and no link,
  so the page is not fetched or re-read, and no category request is made. The page, its photos and the admin's
  choices are kept.
- **Output is not limited:** the full Arabic and English copy, FAQ and SEO are still asked for.

| Scenario | Requests | Characters sent | Largest request | ≈ input tokens |
|---|---:|---:|---:|---:|
| Product draft + 1 update — before | 4 | 134,704 | 33,798 | 33,678 |
| Product draft + 1 update — after | 3 | 19,269 | 8,687 | 4,818 |

**Result:** −86% characters sent. The page is fetched once (checked in the test), and the specification rows still
reach the model (checked).

## Phase 4: proposal safety
A proposal signs, together with the change, the values it was made against and an expiry 30 minutes later.
`POST /admin/assistant/execute` checks the following in order, and applies nothing if any fails:
1. **The signature.** Changing the change, the summary or the expiry breaks it.
2. **The expiry.**
3. **The current values:**
   - **Prices:** every variant must still have the price shown in the proposal. A bulk change is all-or-nothing,
     and the refusal names up to 5 changed variants.
   - **Product edits:** the edited fields must still hold the values they had.

Pressing the button a second time is refused as stale, because the price already changed. A bulk change applies
exactly the list fixed at proposal time; nothing is searched again on execution.

## Phase 5: before / after
Same scripted scenarios, same store data, same code paths (`ai-baseline.spec.ts`):

| Scenario | Requests | Characters sent | Largest request |
|---|---:|---:|---:|
| Assistant, 4 questions | 9 → 9 | 106,211 → 67,091 (−37%) | 20,346 → 11,897 |
| Product draft + 1 update | 4 → 3 | 134,704 → 19,269 (−86%) | 33,798 → 8,687 |
| **Both** | 13 → 12 | **240,915 → 86,360 (−64%)** | |

**What the tests confirm stayed correct:**
- the TP-Link bulk change is one proposal for all 15 routers, inside the step limit;
- specification rows still reach the model;
- the page is fetched once per product;
- invented specs are still dropped;
- proposals are still applied only on the button, now also refused when stale or expired;
- all earlier tests pass.

**What these numbers are not:**
- **They are not money.** The scripted model counts characters ÷ 4. Real tokens, cache hits and dollars come from
  the `ai_usage` table in production.
- **They don't show the cache effect.** 47,000 of the remaining assistant characters are the fixed instructions and
  tool list, which the provider may cache; `cached_tokens` will show it.
- **They don't measure answer quality with the real model.** One known trade-off: a follow-up that relies on an
  earlier tool result ("the second one in that list") now makes the model search again, because old results are
  no longer sent. That costs one search instead of resending everything every time.

**How to compare real spending:**
- Note the daily cost and the average cost per run in admin → المساعد الذكي for a week.
- Do the same per task, especially `admin_chat`, `product_draft` and `product_category`.
- Before this change no costs were recorded, so the first week after deployment is the real baseline. The scripted
  comparison above is the only before/after available for the code itself.
