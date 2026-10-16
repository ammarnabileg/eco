# eco

E-commerce monorepo: Medusa v2 backend + Next.js 15 storefront, managed with pnpm and Turborepo.

```
apps/backend     Medusa (API + admin dashboard at /app), port 9000
apps/storefront  Next.js storefront, port 8000
```

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
pnpm exec medusa db:migrate                                 # also seeds initial data
pnpm exec medusa user -e you@example.com -p <password>      # admin login
cd ../..

pnpm backend:seed   # optional: 50 demo products
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
