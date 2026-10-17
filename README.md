# eco

E-commerce monorepo: Medusa v2 backend + Next.js 15 storefront, managed with pnpm and Turborepo.

```
apps/backend     Medusa (API + admin dashboard at /app), port 9000
apps/storefront  Next.js storefront (Arabic, RTL), port 8000
apps/mcp         MCP server: AI assistants manage the store via the admin API
```

## How each part is built

Every feature follows the same layers, so people (admin panel) and AI
(MCP tools) drive it the same way:

| Layer | Where |
|---|---|
| Data model + service | `apps/backend/src/modules/<feature>` |
| Business logic (with rollback) | `apps/backend/src/workflows/<feature>` |
| Validated API | `apps/backend/src/api/admin/...`, `apps/backend/src/api/store/...` |
| Admin UI | `apps/backend/src/admin/routes/...` |
| Storefront | `apps/storefront/src/lib/data/...` + `modules/...` |
| AI tools | `apps/mcp/src/tools/...` |

Managed from the admin: contact details, trust badges (warranty/returns/
delivery promises), hero carousel slides (ar/en, scheduled), and offers
(Price Lists with real start/end dates that drive the storefront countdowns).

Search: Meilisearch when `MEILISEARCH_HOST` is set (Docker Compose runs it),
otherwise Medusa's Postgres search. The provider (`apps/backend/src/modules/meilisearch`)
adds Arabic tokenization, typo tolerance, Gulf-dialect and Arabic/English
synonyms (`language.ts`), phrase rewriting, and a word-by-word fallback for
conversational queries. Offers re-index their products every 5 minutes
(`src/jobs/sync-offer-search-prices.ts`).

Catalogue: category tree, spec templates (filters), brands, add-ons (RAM/SSD/
HDD...), price-on-request with quote requests, and the Botble import and
content pipeline. How the products were built and how to continue:
[docs/CATALOG.md](docs/CATALOG.md).

Payments: KNET, Visa/Mastercard and Apple/Google/Samsung Pay via KlickPay,
plus Taly and Deema instalments. Setup, webhooks, test cards and the open
questions for each gateway: [docs/PAYMENTS.md](docs/PAYMENTS.md).

Accounting: products, orders, payments and refunds sync to QuickBooks Online
(connect from Settings > QuickBooks). QuickBooks keeps 2 decimals, so KWD fils
are rounded with an explicit rounding line: [docs/QUICKBOOKS.md](docs/QUICKBOOKS.md).

Google Merchant Center feeds: `/feeds/google/ar` and `/feeds/google/en` on the
backend (set `STOREFRONT_URL`). Google does not accept SVG images, so real
product photos (JPG/PNG/WebP) are required before submitting the feed.

## Requirements

- Node 22.22+ (`.nvmrc`), pnpm 10 (`corepack enable`)
- PostgreSQL 15+ and Redis 7 (or use Docker, below)

## Local development

```bash
pnpm install
cp apps/backend/.env.template apps/backend/.env            # set DATABASE_URL
cp apps/storefront/.env.template apps/storefront/.env.local

cd apps/backend
pnpm exec medusa db:create --db eco
pnpm exec medusa db:migrate                                 # seeds Kuwait region, categories, demo catalogue
pnpm exec medusa user -e you@example.com -p <password>      # admin login
cd ../..

pnpm dev            # backend on :9000, storefront on :8000
```

Copy the publishable key from the admin (Settings > Publishable API Keys) into
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in `apps/storefront/.env.local`.

## Docker

```bash
cp .env.example .env    # fill in secrets: openssl rand -hex 32
docker compose up -d --build
# after creating a publishable key, set it in .env, then:
docker compose --profile storefront up -d --build
```

## Checks

```bash
pnpm lint
pnpm build
pnpm test                                        # backend unit tests
cd apps/backend && pnpm test:integration:http    # needs Postgres (DB_HOST, DB_USERNAME, DB_PASSWORD)
```

CI (`.github/workflows/ci.yml`) runs all of the above plus both Docker builds on every push to `main` and every PR.

## Security defaults

- Backend refuses to start in production with missing or weak `JWT_SECRET` / `COOKIE_SECRET`, or without `REDIS_URL`.
- Redis-backed event bus, workflow engine, caching, and locking in production (safe for multiple instances, no stock overselling from concurrent checkouts).
- Storefront sends HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, and `Permissions-Policy` headers. A CSP still has to be written once payment and analytics providers are chosen.
- Lint and type errors fail the storefront build.
- Containers run as non-root, with health checks.
- pnpm blocks dependency install scripts unless they are allowlisted in `pnpm-workspace.yaml`.
- Card data never touches this codebase: use the payment provider's hosted page or iframe.
