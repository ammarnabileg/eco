// Third-party services the admin can configure without touching the server.
// Each field is either a plain value (kept in `config`, may be public) or a
// secret (encrypted at rest, never returned to the browser).

export type FieldType = "text" | "secret" | "select" | "multiselect"

export type FieldDefinition = {
  key: string
  label: string
  type: FieldType
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  /** Safe to send to the storefront (public IDs only). */
  public?: boolean
  /** Needed before the integration can be switched on. */
  required?: boolean
  /** Environment variable used when the field is empty. */
  env?: string
  default?: string | string[]
}

export type IntegrationDefinition = {
  key: string
  name: string
  group: "payments" | "accounting" | "marketing"
  description: string
  docs?: string
  fields: FieldDefinition[]
}

export const KLICKPAY_METHODS = [
  { value: "knet", label: "كي نت" },
  { value: "card", label: "Visa / Mastercard" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "google_pay", label: "Google Pay" },
  { value: "samsung_pay", label: "Samsung Pay" },
]

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    key: "klickpay",
    name: "KlickPay (كي نت والبطاقات والمحافظ)",
    group: "payments",
    description: "الدفع بكي نت وفيزا/ماستركارد وApple Pay عن طريق KlickPay.",
    docs: "docs/PAYMENTS.md",
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true, env: "KLICKPAY_CLIENT_ID" },
      { key: "client_secret", label: "Client Secret", type: "secret", required: true, env: "KLICKPAY_CLIENT_SECRET" },
      {
        key: "webhook_secret",
        label: "Webhook secret_key",
        type: "secret",
        env: "KLICKPAY_WEBHOOK_SECRET",
        help: "نفس القيمة اللي في إعدادات الـ Webhook عند KlickPay.",
      },
      {
        key: "methods",
        label: "طرق الدفع المعروضة",
        type: "multiselect",
        options: KLICKPAY_METHODS,
        env: "KLICKPAY_METHODS",
        default: ["knet", "card", "apple_pay"],
      },
      {
        key: "base_url",
        label: "رابط الـ API",
        type: "text",
        env: "KLICKPAY_BASE_URL",
        placeholder: "https://api.staging.klick-pay.com/v3",
        help: "فاضي = بيئة التجربة (staging). للإنتاج حط الرابط اللي KlickPay هتديهولك.",
      },
    ],
  },
  {
    key: "taly",
    name: "Taly (تقسيط)",
    group: "payments",
    description: "اشتري الآن وادفع لاحقاً على 4 دفعات.",
    docs: "docs/PAYMENTS.md",
    fields: [
      { key: "username", label: "Username", type: "text", required: true, env: "TALY_USERNAME" },
      { key: "password", label: "Password", type: "secret", required: true, env: "TALY_PASSWORD" },
      {
        key: "base_url",
        label: "رابط الـ API",
        type: "text",
        env: "TALY_BASE_URL",
        placeholder: "https://api.dev-taly.io",
        help: "فاضي = بيئة التجربة.",
      },
    ],
  },
  {
    key: "deema",
    name: "Deema (تقسيط)",
    group: "payments",
    description: "تقسيط بدون فوائد. Deema تشترط ظهور الـ Widget في صفحة المنتج قبل التفعيل.",
    docs: "docs/PAYMENTS.md",
    fields: [
      { key: "api_key", label: "API Key", type: "secret", required: true, env: "DEEMA_API_KEY" },
      {
        key: "base_url",
        label: "رابط الـ API",
        type: "text",
        env: "DEEMA_BASE_URL",
        placeholder: "https://sandbox-api.deema.me/api/merchant/v1",
        help: "للإنتاج: https://api.deema.me/api/merchant/v1",
      },
      {
        key: "webhook_header",
        label: "اسم header الـ Webhook",
        type: "text",
        env: "DEEMA_WEBHOOK_HEADER",
        default: "x-deema-signature",
      },
      { key: "webhook_secret", label: "قيمة header الـ Webhook", type: "secret", env: "DEEMA_WEBHOOK_SECRET" },
      {
        key: "widget_key",
        label: "Widget public key",
        type: "text",
        public: true,
        help: "المفتاح العام للـ Widget (مش الـ API Key).",
      },
      {
        key: "widget_url",
        label: "رابط الـ Widget",
        type: "select",
        public: true,
        options: [
          { value: "https://sandbox-widget.deema.me", label: "Sandbox" },
          { value: "https://widget.deema.me", label: "Production" },
        ],
        default: "https://sandbox-widget.deema.me",
      },
    ],
  },
  {
    key: "quickbooks",
    name: "QuickBooks Online",
    group: "accounting",
    description: "ترحيل المنتجات والطلبات والمرتجعات للمحاسبة. بعد الحفظ اربط الشركة من صفحة QuickBooks.",
    docs: "docs/QUICKBOOKS.md",
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true, env: "QUICKBOOKS_CLIENT_ID" },
      { key: "client_secret", label: "Client Secret", type: "secret", required: true, env: "QUICKBOOKS_CLIENT_SECRET" },
      {
        key: "environment",
        label: "البيئة",
        type: "select",
        env: "QUICKBOOKS_ENVIRONMENT",
        options: [
          { value: "sandbox", label: "Sandbox (تجربة)" },
          { value: "production", label: "Production" },
        ],
        default: "sandbox",
      },
      {
        key: "webhook_verifier",
        label: "Webhook verifier token",
        type: "secret",
        env: "QUICKBOOKS_WEBHOOK_VERIFIER",
        help: "من صفحة Webhooks في تطبيق Intuit. فاضي = الـ Webhook مقفول.",
      },
    ],
  },
  {
    key: "google_merchant",
    name: "Google Merchant Center",
    group: "marketing",
    description: "عرض المنتجات في Google Shopping. الـ feed جاهز، أضف رابطه في Merchant Center.",
    fields: [
      {
        key: "site_verification",
        label: "Google site verification",
        type: "text",
        public: true,
        help: "القيمة اللي في content من وسم <meta name=\"google-site-verification\">.",
      },
      { key: "merchant_id", label: "Merchant ID", type: "text" },
    ],
  },
  {
    key: "adsense",
    name: "Google AdSense",
    group: "marketing",
    description: "إعلانات Google على صفحات المتجر.",
    fields: [
      {
        key: "client",
        label: "Publisher ID",
        type: "text",
        public: true,
        required: true,
        placeholder: "ca-pub-0000000000000000",
      },
    ],
  },
  {
    key: "clarity",
    name: "Microsoft Clarity",
    group: "marketing",
    description: "تسجيل جلسات الزوار وخرائط الضغط لتحسين التصميم.",
    fields: [{ key: "project_id", label: "Project ID", type: "text", public: true, required: true }],
  },
]

export const integrationDefinition = (key: string) => INTEGRATIONS.find((i) => i.key === key)

export type IntegrationValues = Record<string, string | string[] | undefined>

/**
 * Effective values of an integration: what the admin saved, then the
 * server's environment variables, then the field default.
 */
export function resolveValues(
  def: IntegrationDefinition,
  saved: IntegrationValues,
  env: Record<string, string | undefined> = process.env
): IntegrationValues {
  const out: IntegrationValues = {}
  for (const f of def.fields) {
    const value = saved[f.key]
    const present = Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim() !== ""
    const fromEnv = f.env ? env[f.env] : undefined
    out[f.key] = present ? value : fromEnv?.trim() ? fromEnv.trim() : f.default
  }
  return out
}

/** Required fields that still have no value. */
export function missingFields(def: IntegrationDefinition, values: IntegrationValues) {
  return def.fields.filter((f) => f.required && !values[f.key]).map((f) => f.key)
}
