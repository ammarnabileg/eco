# Admin assistant (Claude)

Admin → المساعد الذكي. Staff chat in Arabic or English. The assistant reads the store and prepares changes; it
never applies a change by itself.

## Setup
Admin → التكاملات → الذكاء الاصطناعي: paste an Anthropic API key (console.anthropic.com), choose the model
(Claude Opus 5.5 by default, Claude Sonnet 5.5 is cheaper) and switch it on. `ANTHROPIC_API_KEY` on the server
also works.

## What it can do
| Tool | Kind |
|---|---|
| `search_products`, `get_product` | read |
| `list_orders`, `get_order`, `sales_summary` | read |
| `whatsapp_inbox` | read |
| `set_price` (one variant), `adjust_prices` (percent over many products, rounded) | proposal |
| `update_product` (title, subtitle, description, published/draft) | proposal |

A proposal becomes a card with **تنفيذ / تجاهل**. The card's summary shows old → new values read from the store at
the time of the proposal. Pressing تنفيذ sends the action to `POST /admin/assistant/execute`, which:
- checks an HMAC signature, so what runs is exactly what was shown;
- applies it through Medusa's own workflows. Prices in other currencies are kept;
- logs who applied it.

It cannot cancel or refund orders, message customers or change settings.

## How it runs
`POST /admin/assistant/chat` runs one turn: Claude with the tools until it answers, at most 10 steps.
- **Model settings:** adaptive thinking, effort `medium`, prompt caching, and server-side fallbacks (`fallbacks: "default"`).
- **History:** the conversation is kept in the admin's browser (localStorage) and sent back whole each turn, thinking
  blocks included. "محادثة جديدة" clears it.
- **Applied changes:** they are reported to the assistant with the next message.

Costs: every message is billed by Anthropic to the key's account. A turn that reads many products costs more.
