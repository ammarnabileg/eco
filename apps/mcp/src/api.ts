// Medusa admin API client. Authenticates with an admin Secret API Key
// (Medusa admin > Settings > Secret API Keys), so the store owner controls and
// can revoke the assistant's access at any time.

export const BACKEND_URL = (process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "")
const API_KEY = process.env.MEDUSA_ADMIN_API_KEY ?? ""

export const CURRENCY = "kwd"
export const CHARACTER_LIMIT = 25_000

export class ApiError extends Error {
  constructor(
    readonly status: number,
    detail: string
  ) {
    super(httpErrorMessage(status, detail))
  }
}

function httpErrorMessage(status: number, detail: string): string {
  switch (status) {
    case 400:
      return `Medusa rejected the input: ${detail}. Fix the listed field and try again.`
    case 401:
      return "Medusa rejected the API key. Check MEDUSA_ADMIN_API_KEY is a valid secret key (sk_...)."
    case 403:
      return "This API key is not allowed to do that."
    case 404:
      return `Not found: ${detail}. Use a list/search tool to get valid IDs.`
    case 429:
      return "Rate limited. Wait a minute and retry."
    default:
      return `Medusa returned HTTP ${status}: ${detail}`
  }
}

export async function api<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE"
    query?: Record<string, string | number | boolean | string[] | undefined>
    body?: unknown
    signal?: AbortSignal
  } = {}
): Promise<T> {
  if (!API_KEY) {
    throw new Error("MEDUSA_ADMIN_API_KEY is not set. Create a secret API key in the Medusa admin and pass it to the server.")
  }

  const url = new URL(`${BACKEND_URL}${path}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(`${key}[]`, v))
    else url.searchParams.set(key, String(value))
  }

  const signals = [AbortSignal.timeout(30_000), ...(options.signal ? [options.signal] : [])]
  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}`,
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.any(signals),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Medusa did not respond within 30 seconds. Check the backend is running and retry.")
    }
    throw new Error(`Cannot reach Medusa at ${BACKEND_URL}: ${(error as Error).message}`)
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((b) => (b as { message?: string }).message ?? response.statusText)
      .catch(() => response.statusText)
    throw new ApiError(response.status, detail)
  }
  return (await response.json()) as T
}

// KWD has three decimals.
export const kwd = (amount: number | null | undefined) =>
  amount === null || amount === undefined ? "—" : `${amount.toFixed(3)} KWD`
