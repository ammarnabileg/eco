import { loadEnv, defineConfig, MedusaError } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProduction = process.env.NODE_ENV === "production"
const redisUrl = process.env.REDIS_URL

// Refuse to boot in production with missing or placeholder secrets. A weak
// JWT/cookie secret lets anyone forge admin sessions.
const WEAK_SECRETS = new Set(["", "supersecret", "changeme", "secret"])

function requireSecret(name: string): string | undefined {
  const value = process.env[name]
  if (isProduction && (value === undefined || WEAK_SECRETS.has(value) || value.length < 32)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${name} must be set to a random value of at least 32 characters in production`
    )
  }
  return value
}

if (isProduction && !redisUrl) {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, "REDIS_URL is required in production")
}

// In-memory event bus, workflow engine, and locking only work for a single
// process. With Redis they are shared, so the server and worker stay consistent
// and concurrent checkouts cannot oversell stock.
const redisModules = redisUrl
  ? [
      {
        resolve: "@medusajs/medusa/caching",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/caching-redis",
              id: "caching-redis",
              is_default: true,
              options: { redisUrl },
            },
          ],
        },
      },
      {
        resolve: "@medusajs/medusa/event-bus-redis",
        options: { redisUrl },
      },
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: { redis: { redisUrl } },
      },
      {
        resolve: "@medusajs/medusa/locking",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/locking-redis",
              id: "locking-redis",
              is_default: true,
              options: { redisUrl },
            },
          ],
        },
      },
    ]
  : []

// Search: Meilisearch when configured, otherwise Medusa's built-in Postgres
// provider. Postgres stays registered so switching providers re-indexes cleanly.
const meilisearch = process.env.MEILISEARCH_HOST
  ? [
      {
        resolve: "@medusajs/medusa/search",
        options: {
          providers: [
            { resolve: "@medusajs/medusa/search-postgres", id: "postgres", options: { engine: "native" } },
            {
              resolve: "./src/modules/meilisearch",
              id: "meilisearch",
              options: {
                host: process.env.MEILISEARCH_HOST,
                apiKey: process.env.MEILISEARCH_API_KEY,
                indexPrefix: process.env.MEILISEARCH_INDEX_PREFIX,
              },
            },
          ],
          default_provider: "meilisearch",
        },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl,
    // "server" serves HTTP only, "worker" runs jobs/subscribers only, "shared" does both.
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: requireSecret("JWT_SECRET"),
      cookieSecret: requireSecret("COOKIE_SECRET"),
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  modules: [{ resolve: "./src/modules/store-content" }, ...meilisearch, ...redisModules],
})
