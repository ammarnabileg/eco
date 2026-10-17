import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

// QuickBooks Online Accounting API v3 and Intuit OAuth 2.0. Plain HTTP, no
// SDK: the surface used is small (token, query, create, update).

export const INTUIT_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2"
export const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
export const INTUIT_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke"
export const QBO_SCOPE = "com.intuit.quickbooks.accounting"
export const QBO_MINOR_VERSION = "75"

export const apiBase = (environment: "sandbox" | "production") =>
  environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com"

export type TokenSet = {
  access_token: string
  refresh_token: string
  /** seconds */
  expires_in: number
  x_refresh_token_expires_in?: number
}

export class QboError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string
  ) {
    super(message)
  }
}

const basic = (id: string, secret: string) => `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`

async function call(url: string, init: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) })
  } catch (error) {
    throw new QboError(0, null, `QuickBooks unreachable: ${(error as Error).message}`)
  }
  const text = await res.text()
  let body: Record<string, unknown> = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text.slice(0, 500) }
  }
  return { status: res.status, body }
}

// --- OAuth --------------------------------------------------------------

/** Signed, expiring `state` so the callback only accepts flows we started. */
export function signState(secret: string, ttlSeconds = 600, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ n: randomBytes(8).toString("hex"), e: now + ttlSeconds * 1000 })).toString(
    "base64url"
  )
  const sig = createHmac("sha256", secret).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

export function verifyState(state: string, secret: string, now = Date.now()): boolean {
  const [payload, sig] = (state ?? "").split(".")
  if (!payload || !sig) return false
  const expected = createHmac("sha256", secret).update(payload).digest("base64url")
  const a = Buffer.from(expected)
  const b = Buffer.from(sig)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).e > now
  } catch {
    return false
  }
}

export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: QBO_SCOPE,
    redirect_uri: redirectUri,
    state,
  })
  return `${INTUIT_AUTHORIZE_URL}?${params}`
}

async function tokenRequest(clientId: string, clientSecret: string, form: Record<string, string>): Promise<TokenSet> {
  const { status, body } = await call(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basic(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(form).toString(),
  })
  if (status >= 400 || typeof body.access_token !== "string" || typeof body.refresh_token !== "string") {
    throw new QboError(status, String(body.error ?? ""), `QuickBooks token request failed: ${body.error ?? status}`)
  }
  return body as unknown as TokenSet
}

export const exchangeCode = (clientId: string, clientSecret: string, code: string, redirectUri: string) =>
  tokenRequest(clientId, clientSecret, { grant_type: "authorization_code", code, redirect_uri: redirectUri })

/** Intuit may rotate the refresh token: always store the one returned. */
export const refreshTokens = (clientId: string, clientSecret: string, refreshToken: string) =>
  tokenRequest(clientId, clientSecret, { grant_type: "refresh_token", refresh_token: refreshToken })

export async function revokeToken(clientId: string, clientSecret: string, token: string) {
  await call(INTUIT_REVOKE_URL, {
    method: "POST",
    headers: { Authorization: basic(clientId, clientSecret), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token }),
  })
}

// --- Accounting API ------------------------------------------------------

type Entity = Record<string, unknown> & { Id?: string; SyncToken?: string }

/** Values in QBO queries are single-quoted; quotes inside are backslash-escaped. */
export const qboString = (value: string) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`

export class QboClient {
  constructor(
    private readonly environment: "sandbox" | "production",
    private readonly realmId: string,
    private readonly accessToken: string
  ) {}

  private url(path: string, params: Record<string, string> = {}) {
    const qs = new URLSearchParams({ minorversion: QBO_MINOR_VERSION, ...params })
    return `${apiBase(this.environment)}/v3/company/${this.realmId}/${path}?${qs}`
  }

  private async send(method: "GET" | "POST", path: string, body?: unknown, params: Record<string, string> = {}) {
    const { status, body: res } = await call(this.url(path, params), {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const fault = (res.Fault as { Error?: { code?: string; Message?: string; Detail?: string }[] } | undefined)?.Error?.[0]
    if (status >= 400 || fault) {
      throw new QboError(
        status,
        fault?.code ?? null,
        `QuickBooks ${path} failed (${status}${fault?.code ? ` ${fault.code}` : ""}): ${fault?.Detail ?? fault?.Message ?? JSON.stringify(res).slice(0, 300)}`
      )
    }
    return res
  }

  async query<T extends Entity>(entity: string, where: string): Promise<T[]> {
    const res = await this.send("GET", "query", undefined, { query: `select * from ${entity} where ${where}` })
    const qr = (res.QueryResponse ?? {}) as Record<string, unknown>
    return ((qr[entity] as T[]) ?? []) as T[]
  }

  /**
   * Creates an entity. `requestId` makes the call idempotent: QuickBooks
   * returns the first result when the same id is sent again.
   */
  async create<T extends Entity>(entity: string, payload: Record<string, unknown>, requestId?: string): Promise<T> {
    const res = await this.send("POST", entity.toLowerCase(), payload, requestId ? { requestid: requestId } : {})
    return res[entity] as T
  }

  async update<T extends Entity>(entity: string, payload: Record<string, unknown> & { Id: string; SyncToken: string }): Promise<T> {
    const res = await this.send("POST", entity.toLowerCase(), { ...payload, sparse: true })
    return res[entity] as T
  }

  async read<T extends Entity>(entity: string, id: string): Promise<T> {
    const res = await this.send("GET", `${entity.toLowerCase()}/${encodeURIComponent(id)}`)
    return res[entity] as T
  }

  async companyName(): Promise<string | null> {
    const res = await this.send("GET", `companyinfo/${this.realmId}`)
    return ((res.CompanyInfo as Record<string, unknown> | undefined)?.CompanyName as string) ?? null
  }
}
