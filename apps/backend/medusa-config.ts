import { loadEnv, defineConfig, MedusaError } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// An empty variable means "not set". Hosting panels (Coolify, Docker Compose
// `${VAR}`) pass declared-but-blank variables as "", which would otherwise
// override every default below.
for (const [key, value] of Object.entries(process.env)) {
  if (value === "") delete process.env[key]
}

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

// Public URLs feed CORS, upload links, payment return URLs and OAuth
// callbacks. Without them the server boots "healthy" but admin login and
// checkout fail, so refuse to start instead.
for (const name of ["MEDUSA_BACKEND_URL", "STOREFRONT_URL"]) {
  if (isProduction && !/^https?:\/\//.test(process.env[name] ?? "")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${name} must be set to the public URL (https://...) in production`
    )
  }
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

// Payments: each gateway is enabled by its own keys. Customers are sent to
// the gateway's hosted page and the result is confirmed server-side.
const storefrontUrls = (process.env.STOREFRONT_URL ?? "http://localhost:8000")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean)
const env = process.env
// KNET, cards and wallets through KlickPay; one provider per checkout page.
const KLICKPAY_METHODS: Record<string, string> = {
  knet: "knet",
  card: "mpgs",
  apple_pay: "apple-pay",
  google_pay: "google-pay",
  samsung_pay: "samsung-pay",
}
// Every gateway is registered; whether customers see it depends on its keys,
// saved in the admin (Settings > Integrations) or set here as environment
// variables. Saving keys in the admin attaches the gateway to the KWD regions.
const paymentProviders = [
  ...Object.entries(KLICKPAY_METHODS).map(([id, method]) => ({
    resolve: "./src/modules/payment-klickpay",
    id,
    options: {
      clientId: env.KLICKPAY_CLIENT_ID,
      clientSecret: env.KLICKPAY_CLIENT_SECRET,
      webhookSecret: env.KLICKPAY_WEBHOOK_SECRET,
      baseUrl: env.KLICKPAY_BASE_URL,
      method,
      methodId: id,
      storefrontUrls,
    },
  })),
  {
    resolve: "./src/modules/payment-taly",
    id: "taly",
    options: {
      username: env.TALY_USERNAME,
      password: env.TALY_PASSWORD,
      baseUrl: env.TALY_BASE_URL,
      backendUrl: env.MEDUSA_BACKEND_URL ?? "http://localhost:9000",
      storefrontUrls,
    },
  },
  {
    resolve: "./src/modules/payment-deema",
    id: "deema",
    options: {
      apiKey: env.DEEMA_API_KEY,
      baseUrl: env.DEEMA_BASE_URL,
      webhookHeader: env.DEEMA_WEBHOOK_HEADER,
      webhookSecret: env.DEEMA_WEBHOOK_SECRET,
      storefrontUrls,
    },
  },
]
// Uploaded files (admin images, imports). S3-compatible storage (Cloudflare
// R2, S3) when configured; otherwise the server's disk under ./static, which
// must be a persistent volume in Docker or uploads vanish on redeploy.
const backendUrl = (env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "")
const files = [
  {
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [
        env.S3_BUCKET
          ? {
              resolve: "@medusajs/medusa/file-s3",
              id: "s3",
              options: {
                file_url: env.S3_FILE_URL,
                bucket: env.S3_BUCKET,
                region: env.S3_REGION ?? "auto",
                endpoint: env.S3_ENDPOINT,
                access_key_id: env.S3_ACCESS_KEY_ID,
                secret_access_key: env.S3_SECRET_ACCESS_KEY,
                prefix: env.S3_PREFIX,
                additional_client_config: { forcePathStyle: true },
              },
            }
          : {
              resolve: "@medusajs/medusa/file-local",
              id: "local",
              options: { upload_dir: "static", backend_url: `${backendUrl}/static` },
            },
      ],
    },
  },
]

const payments = paymentProviders.length
  ? [{ resolve: "@medusajs/medusa/payment", options: { providers: paymentProviders } }]
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
  modules: [
    { resolve: "./src/modules/store-content" },
    { resolve: "./src/modules/catalog" },
    // Keys for payments, QuickBooks and marketing tools, editable in the admin.
    { resolve: "./src/modules/integrations" },
    {
      // QuickBooks Online: optional; syncing starts once an admin connects.
      resolve: "./src/modules/quickbooks",
      options: {
        clientId: env.QUICKBOOKS_CLIENT_ID,
        clientSecret: env.QUICKBOOKS_CLIENT_SECRET,
        environment: env.QUICKBOOKS_ENVIRONMENT === "production" ? "production" : "sandbox",
        redirectUri:
          env.QUICKBOOKS_REDIRECT_URI ?? `${env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"}/quickbooks/callback`,
        encryptionKey: env.QUICKBOOKS_ENCRYPTION_KEY,
      },
    },
    ...files,
    ...meilisearch,
    ...payments,
    ...redisModules,
  ],
})
