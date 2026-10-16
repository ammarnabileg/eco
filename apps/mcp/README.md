# laly-mcp-server

MCP server that lets an AI assistant (Claude Code, Claude Desktop, or any MCP
client) run the Laly store through the Medusa admin API. Every call goes
through the same API routes, validation, and workflows as the admin panel.

## Setup

1. In the Medusa admin: **Settings → Secret API Keys → Create**. Copy the `sk_...` key.
   Revoking the key in the admin cuts the assistant off immediately.
2. Build: `pnpm --filter laly-mcp-server build`
3. Export the key, then start Claude Code from the repo root. `.mcp.json`
   registers this server as `laly` (and Medusa's docs server as `medusa-docs`):

   ```bash
   export LALY_MCP_ADMIN_KEY=sk_...
   export MEDUSA_BACKEND_URL=http://localhost:9000   # or the production API URL
   claude
   ```

   Claude Desktop: add the same `command`/`args`/`env` block to its config
   with an absolute path to `apps/mcp/dist/index.js`.

Never commit the key. `.mcp.json` only references the environment variable.

## Tools

| Area | Tools |
|---|---|
| Store content | `laly_get_store_content`, `laly_update_contact`, `laly_create_hero_slide`, `laly_update_hero_slide`, `laly_delete_hero_slide`, `laly_create_trust_badge`, `laly_update_trust_badge`, `laly_delete_trust_badge` |
| Catalogue | `laly_search_products`, `laly_update_product`, `laly_set_price` |
| Offers | `laly_list_offers`, `laly_create_offer`, `laly_update_offer`, `laly_delete_offer` |
| Orders (read-only) | `laly_list_orders`, `laly_get_order` |

Delete tools are annotated destructive, so clients ask before running them.
Orders are read-only on purpose: refunds and cancellations stay in the admin.

Example requests:

- "غيّر رقم الواتساب إلى +965 5555 1234"
- "اعمل عرض 15% على كل كاميرات Hikvision لحد الخميس الساعة 11 بالليل"
- "اكتب وصف عربي وإنجليزي لراوتر Archer C6"
- "كم طلب وصلنا اليوم وكم مجموعهم؟"

## Check

```bash
pnpm --filter laly-mcp-server build
MEDUSA_ADMIN_API_KEY=sk_... pnpm --filter laly-mcp-server smoke   # needs a running backend; reverts its changes
```
