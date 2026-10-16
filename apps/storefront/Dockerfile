# Build from the repository root:
#   docker build -f apps/storefront/Dockerfile \
#     --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_... \
#     --build-arg NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.example.com \
#     -t eco-storefront .
#
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# they must be passed as build args. Never put secrets in NEXT_PUBLIC_* vars.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/storefront/package.json apps/storefront/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @dtc/storefront...
COPY apps/storefront apps/storefront

ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
ARG NEXT_PUBLIC_DEFAULT_REGION=kw
ARG NEXT_PUBLIC_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_STRIPE_KEY=
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_STRIPE_KEY=$NEXT_PUBLIC_STRIPE_KEY
RUN pnpm --filter @dtc/storefront build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/storefront/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=node:node /repo/apps/storefront/public ./apps/storefront/public
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8000/ >/dev/null || exit 1
CMD ["node", "apps/storefront/server.js"]
