# Build from the repository root:
#   docker build -f apps/backend/Dockerfile -t eco-backend .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH MEDUSA_DISABLE_TELEMETRY=true
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @dtc/backend...
COPY apps/backend apps/backend
RUN pnpm --filter @dtc/backend build
# Production node_modules resolved from the lockfile, plus the compiled server.
# Only these two go into the image; raw TypeScript sources must not, or Medusa
# loads them instead of the compiled output.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @dtc/backend deploy --prod --legacy /deploy \
 && mkdir /out \
 && mv /deploy/node_modules /out/node_modules \
 && cp -r apps/backend/.medusa/server/. /out/ \
 && cp -r apps/backend/data /out/data \
 && mkdir -p /out/static

FROM node:22-alpine AS runtime
ENV NODE_ENV=production MEDUSA_DISABLE_TELEMETRY=true PORT=9000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
COPY --chown=node:node apps/backend/docker-entrypoint.sh ./docker-entrypoint.sh
# ./static holds uploads when no S3 bucket is set: mount a volume on it. It is
# created here, owned by node, so a fresh named volume inherits that owner.
USER node
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9000/health || exit 1
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
