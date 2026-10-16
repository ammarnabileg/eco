import { MedusaError } from "@medusajs/framework/utils"

// Minimal Meilisearch REST client (fetch-based, no extra dependency).

export type MeiliTask = {
  taskUid?: number
  uid?: number
  indexUid?: string | null
  status: "enqueued" | "processing" | "succeeded" | "failed" | "canceled"
  error?: { message: string; code: string } | null
}

export class MeiliClient {
  constructor(
    private readonly host: string,
    private readonly apiKey: string,
    private readonly timeoutMs = 10_000
  ) {}

  async request<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.host}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Meilisearch unreachable at ${this.host}: ${(error as Error).message}`
      )
    }
    if (response.status === 204) {
      return undefined as T
    }
    const payload = (await response.json().catch(() => ({}))) as { message?: string; code?: string }
    if (!response.ok) {
      throw new MedusaError(
        response.status === 404 ? MedusaError.Types.NOT_FOUND : MedusaError.Types.UNEXPECTED_STATE,
        `Meilisearch ${method} ${path} failed (${response.status} ${payload.code ?? ""}): ${payload.message ?? "unknown error"}`
      )
    }
    return payload as T
  }

  async waitForTask(uid: number, timeoutMs = 30_000): Promise<MeiliTask> {
    const deadline = Date.now() + timeoutMs
    let delay = 50
    for (;;) {
      const task = await this.request<MeiliTask>("GET", `/tasks/${uid}`)
      if (task.status === "succeeded" || task.status === "failed" || task.status === "canceled") {
        return task
      }
      if (Date.now() > deadline) {
        return task
      }
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 2, 1000)
    }
  }
}
