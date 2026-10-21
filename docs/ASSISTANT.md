# Admin assistant (Claude)

Admin → المساعد الذكي. Staff chat in Arabic or English. The assistant reads the store and prepares changes; it
never applies a change by itself.

## Setup
Admin → التكاملات → الذكاء الاصطناعي. Choose the provider and switch it on:

- **Anthropic (Claude, direct):**
  - Paste an Anthropic API key from console.anthropic.com. `ANTHROPIC_API_KEY` on the server also works.
  - Choose the model: Claude Opus 5.5 by default, or Claude Sonnet 5.5, which is cheaper.
- **OpenRouter:**
  - Paste an OpenRouter key (`OPENROUTER_API_KEY` also works).
  - Write the model id exactly as shown on openrouter.ai/models.
  - The model must support tool calling. Small or cheap models call tools badly: they pick the wrong product, or
    write broken arguments, which are sent back to the model as errors. Test a model with read-only questions
    before trusting its proposals.
  - Requests go to `https://openrouter.ai/api/v1/chat/completions` in the OpenAI chat format, with
    `HTTP-Referer` and `X-OpenRouter-Title` attribution headers.

Switching provider starts a new conversation, because the two keep history in different formats.

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
- **Anthropic model settings:** adaptive thinking, effort `medium`, prompt caching, and server-side fallbacks
  (`fallbacks: "default"`). OpenRouter requests send only the model, messages and tools.
- **History:** the conversation is kept in the admin's browser (localStorage) and sent back whole each turn, thinking
  blocks included. "محادثة جديدة" clears it.
- **Applied changes:** they are reported to the assistant with the next message.

Costs: every message is billed to the key's account (Anthropic or OpenRouter credits). A turn that reads many products costs more.
