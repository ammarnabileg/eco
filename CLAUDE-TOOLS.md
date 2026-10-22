# CLAUDE-TOOLS.md

Working notes for Claude on this repository: who the owner is, how they want to work, what is built, which tools to use,
how to run and verify things, and the mistakes already made once. Read this together with [AGENTS.md](./AGENTS.md)
before any task. Keep it current: update it in the same commit as any change that makes it wrong.

No secrets here, ever. Keys live in the server environment or, encrypted, in the admin Integrations page.

---

## 1. The owner and how to work with them

- **Language:** reply in Arabic (Egyptian dialect is fine). Code, comments and commit messages stay in English.
- **Tone:** the owner asked for brutal honesty. No flattery and no softening. Challenge weak ideas with reasons, say
  plainly when something is risky or a bad idea, and report failures as failures.
- **Branch:** work on `main` and push to `main`. The owner deploys manually after each push.
- **Untested work** that would reach production through a migration may be parked on a side branch, then merged to
  `main` once tests pass. Tell the owner when you do this.
- **No pull requests** unless asked.
- **Commits:** clear English messages, no model identifiers, and end every message with the attribution lines the
  session gives.
- **Never commit, print or paste secrets.** The owner has pasted tokens in chat before; if they do, tell them to rotate
  the token and do not reuse it.
- **No production actions without being asked.** Don't change production settings, deploy, or touch live data unless
  the owner asks.
- **Verify before claiming.** Run the tests and lint, and build when routes change, before saying something works. If
  a check was skipped, say so. The owner was told "all tests pass" once when the unit tests had not been rerun. Don't
  repeat that.
- **End-of-task report, in Arabic:** what was done, how it was verified, what the owner must do (redeploy, settings,
  tests), and the real weaknesses.

## 2. The project

**Laly** (lalykw.com) is an electronics store in Kuwait. Arabic RTL first, English second. Prices are in KWD with 3
decimals.

| Part | Path | Stack |
|---|---|---|
| Backend + admin | `apps/backend` | Medusa 2.21.2, PostgreSQL, Redis, Meilisearch |
| Storefront | `apps/storefront` | Next.js 15, Arabic RTL, country prefix `/kw` |
| Store MCP server | `apps/mcp` | Tools for content, offers, products and orders (`.mcp.json`, server `laly`) |

**Package manager:** pnpm. Never create another lockfile and never hand-edit `pnpm-lock.yaml`.

### Deployment (Coolify at cool.kuw1.com)

| Resource | UUID | URL |
|---|---|---|
| `laly-backend` (compose: server + worker) | `lbn7a0gfldg8bfbmuozc0tfr` | https://api.lalykw.com (admin at `/app`) |
| `laly-storefront` | `cngdhfvayuojcbivpcbxxi18` | https://www.lalykw.com |

- The apex `lalykw.com` has no DNS record yet.
- No Coolify token is available to Claude. The owner redeploys by hand: the backend first whenever there is a
  migration, then the storefront.
- See `docs/DEPLOY-COOLIFY.md`.

### What is built (details in `docs/`)

| Area | Where | Doc |
|---|---|---|
| Admin-managed content: contact, trust badges, hero slides, offers with countdowns | `modules/store-content` | — |
| Catalog: brands, spec templates, add-ons, quote requests; Botble import of 552 products | `modules/catalog` | `docs/CATALOG.md` |
| Arabic/Gulf-tuned search | `modules/meilisearch` | — |
| Google Merchant feeds (ar/en) | `api/feeds/google/[lang]` | — |
| Payments: KNET, cards and wallets via KlickPay; Taly and Deema instalments | `modules/payment-*` | `docs/PAYMENTS.md` |
| Instalment eligibility per product and category, enforced on the server | `api/store/bnpl`, `api/store/carts/bnpl-guard.ts`, admin widgets | `docs/PAYMENTS.md` |
| Integrations page: keys entered in the admin, encrypted with AES-GCM, live within about 15s | `modules/integrations`, `admin/routes/integrations` | — |
| QuickBooks Online: OAuth, product/order/refund sync, webhook, currency handling | `modules/quickbooks`, `workflows/quickbooks` | `docs/QUICKBOOKS.md` |
| Personal homepage and account: recently viewed (cookie `_laly_viewed`), picks from orders/views, buy again, last order status | `api/store/recommendations`, `workflows/recommendations`, storefront `modules/home/components/for-you` | — |
| AI admin assistant (Claude direct or OpenRouter): reads products/orders/sales, proposes price and product changes that staff confirm | `workflows/assistant`, `api/admin/assistant`, `admin/routes/assistant` | `docs/ASSISTANT.md` |
| Add a product with AI: official page → grounded copy/specs/SEO, add-on and variant questions, official photos + AI edits, optional video (OpenRouter), saved as draft | `workflows/ai-product`, `api/admin/ai-products`, `admin/routes/ai-product` | `docs/AI-PRODUCTS.md` |
| AI image studio: AI backgrounds, original product photo on a white card, text and store price drawn on a canvas, PNG download, homepage banner slide | `workflows/studio`, `api/admin/studio`, `admin/routes/studio`, `admin/components/studio`, job `studio-stale-slides` | `docs/AI-STUDIO.md` |
| Information and policy pages (about, FAQ, shipping, returns, warranty, privacy, terms): drafts in the admin, numbered published versions, 404 until published, footer/sitemap links | `modules/store-content` (`content_page`, `content_page_revision`), `admin/routes/content/pages`, storefront `modules/content`, `app/sitemap.ts` | — |
| Image storage: Cloudflare R2 or server disk, chosen in the admin (Integrations → تخزين الصور); WebP and resize on upload | `modules/file-media` | `docs/MEDIA.md` |
| Installation bookings: `/kw/installation` form (honeypot + 5 per visitor/hour), page text from the admin page «خدمة التركيب», bookings in Catalog → طلبات التركيب | `modules/catalog` (`install_request`), `api/store/install-requests`, `api/utils/rate-limit.ts`, storefront `modules/services` | — |
| Languages: Arabic (default, no prefix) and English (`/kw/en/...`), more can be added; all UI text in `src/i18n/messages` | storefront `src/i18n`, `middleware.ts` | `docs/I18N.md` |
| WhatsApp via Evolution API (see below) | `modules/whatsapp`, `workflows/whatsapp`, `admin/routes/whatsapp` | `docs/WHATSAPP.md` |

**WhatsApp features:**
- Welcome message on registration.
- Order summary; the customer confirms by replying 1 or 2, or by tapping a button.
- A WhatsApp code guests must enter before paying, enforced on the server.
- Optional interactive messages (buttons, product cards).
- Optional abandoned-cart reminder.
- Admin inbox with staff replies.

**WhatsApp decisions already made:**
- **No bulk campaigns on Evolution.** No splitting sends across several numbers to dodge bans. Claude declined this
  and the safety classifier blocked it, so don't rebuild it.
- **Official Cloud API is out.** The owner dropped it.
- **Evolution setup:** server `https://webs.onz.one`, image `evoapicloud/evolution-api:2.4.0-rc2`. The instance name
  is shown in Evolution Manager (it is not the phone number).
- **Evolution endpoints used:**
  - `POST /message/sendText|sendButtons|sendCarousel/{instance}`
  - `POST /webhook/set/{instance}`
  - `GET /instance/connectionState/{instance}`
  - Header `apikey`.
- **Last known problem:** the gateway returned 401, which means the API key saved in the admin is wrong.

### Open items

- WhatsApp needs a working API key in the admin, then "ضبط الـ Webhook" and a real test.
- Task backlog:
    - Product enrichment pilot of 15 products with official specs (in progress).

## 3. Tools Claude uses here

| Need | Tool |
|---|---|
| Read / search code | `Read`, `Grep`, `Glob`. Use Bash `cat`/`sed`/`grep` for quick looks. |
| Edit files | `Edit` for exact changes, `Write` for new files, Python heredocs for multi-spot mechanical edits |
| Run commands, tests, git | `Bash` |
| GitHub (issues, PRs, CI) | GitHub MCP tools (`mcp__github__*`, load via `ToolSearch`). The `gh` CLI is not available. |
| Store data (products, offers, orders, content) | `laly` MCP tools (`mcp__laly__*`), defined in `apps/mcp`. Read before writing; confirm customer-facing wording and prices with the owner. |
| Medusa docs | `medusa-docs` MCP (needs sign-in) or the `medusa-dev` skills when installed; otherwise official docs on the web |
| Broad searches | `Agent` (Explore) to keep big file dumps out of context |
| Environment problems (network, secrets, setup) | `read_documentation` tool of the cloud session |
| Checking external APIs | `curl` against the real service, e.g. probing the Evolution endpoints with a fake instance shows which routes exist |

## 4. Running and verifying locally (cloud container)

Postgres and Redis stop when the session sleeps. Start them first:

```bash
service postgresql start          # local DB: user postgres / password postgres
redis-server --daemonize yes --dir /tmp
```

Backend checks, from `apps/backend`:

```bash
export DB_HOST=localhost DB_USERNAME=postgres DB_PASSWORD=postgres MEILISEARCH_HOST=   # empty = no Meilisearch
pnpm test:unit
pnpm test:integration:http          # all HTTP suites; add a path to run one
pnpm test:integration:modules
npx tsc --noEmit -p .
pnpm lint                           # must end with "No lint issues found"
pnpm build                          # production build; check .medusa/server/src/api/... has new routes
pnpm exec medusa db:generate <module>   # after any model change
```

Storefront checks, from `apps/storefront`: `npx tsc --noEmit`, `pnpm lint`, `pnpm build`.

**Testing external services:** integration tests start a fake HTTP server, as in `bnpl.spec.ts` and
`whatsapp.spec.ts`, and point the integration's `base_url` at it. Never call real gateways from tests.

## 5. Lessons learned (do not repeat)

- **AI costs:**
  - Every AI request is recorded in `ai_usage`, through `recordAiUsage` in `workflows/ai/usage.ts`.
  - New AI calls must record theirs too.
  - `integration-tests/http/ai-baseline.spec.ts` prints `AI_BASELINE`. Run it before and after any change to
    prompts or context, and update `docs/AI-COSTS.md`.

- **Studio prices are never typed by hand.** Approval reads the numbers in the image's price texts and compares them
  with the store's price. Keep that check whenever the studio's text roles change.
- **Canvas output must be checked in a real browser.** Unit tests with a fake text measure passed while the square
  layout pushed the button off the image and the strike-through missed the old price. Render the sizes in Chromium
  (Playwright, `executablePath: /opt/pw-browsers/chromium`) and look at them.
- **Integration tests that store files write into `apps/backend/static`.** Test images were committed this way once.
  The folder is now git-ignored (Docker creates it), and tests should still delete what they write.
- **Two storefront designs.** Phones follow `index (1).html` (dark app bar, bottom tabs, no footer: its links live
  on the account tab). Desktop follows `laly-site3.html`. Don't shrink the desktop design for phones.
- **Phone screenshots need a phone user-agent.** Some pages (product) pick their layout on the server from the
  user-agent, so a 390px desktop browser shows the desktop layout. Use Playwright `devices["iPhone 13"]`.
- **No hardcoded text in the storefront.** Every visible string goes through `t()` with a key in both `ar` and `en`
  message files (see `docs/I18N.md`). Use logical classes (`ms-`, `start-`, `text-start`) so English (LTR) works,
  and wrap product names in `<bdi>` so English names don't flip inside Arabic text.
- **Policy text is the owner's.** Never write return periods, delivery fees or warranty terms; the pages stay
  unpublished (404) until the owner publishes them.
- **Medusa's production build drops any folder named `test`** under `src/api`. A route at `admin/whatsapp/test`
  worked in development and returned 404 in production. Name such folders differently (`send-test`) and check
  `.medusa/server` after `pnpm build`.
- **Unauthenticated probes mislead.** An unauthenticated request to any `/admin/*` path returns 401 even if the
  route doesn't exist, so a 401 proves nothing. Probe with auth, or in an integration test.
- **Lint rules for steps and workflows:**
  - A step id must match its variable name (kebab-case).
  - A workflow id must match its export name.
  - A step and a workflow must not share an id.
  - Mutations go through workflows.
  - Fix the code; never disable these rules.
- **Changing what an integration exposes to the storefront** (`public: true`) breaks the unit test that lists all
  public fields. Run `pnpm test:unit` too, not only the suite you touched.
- **Nested relation filters in `query.graph`** (e.g. on `shipping_address.phone`) are not reliable. Match through a
  joined query or by ids, and test with real records.
- **The HTTP suites run in one process (`--runInBand`)** and outgrew the default Node heap at 10 suites. The script
  sets `--max-old-space-size=4096`; raise it again if a new suite brings back "heap out of memory".
- **Integration test imports:** core flows come from `@medusajs/medusa/core-flows`, not `@medusajs/core-flows`.
- **QuickBooks:**
  - Request ids must stay within 50 characters (hashed).
  - Send a currency only when the company uses multi-currency.
  - KWD is booked to 2 decimals with a rounding line.
- **Phone numbers** are stored as typed. Normalise with `normalizePhone` (8-digit Kuwaiti numbers get `965`), and
  compare on digits.
- **A gateway failure never blocks a sale.** Subscribers and jobs log the error and show it in the admin (for
  example the WhatsApp status on the order page) instead of throwing into the checkout.
