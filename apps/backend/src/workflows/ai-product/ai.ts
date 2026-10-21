import Anthropic from "@anthropic-ai/sdk"
import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { AiTask, anthropicUsage, newRunId, openRouterUsage, recordAiUsage } from "../ai/usage"
import { assistantSettings } from "../assistant/agent"

// Model calls for creating products: text with the assistant's provider
// (Anthropic or OpenRouter), images and video with OpenRouter.

const openRouterBase = () => (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "")

type Track = { container: MedusaContainer; run_id: string; task: AiTask; model: string }

/** One OpenRouter request; with `track`, its tokens and cost are recorded. */
async function openRouter<T>(
  key: string,
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number; track?: Track } = {}
) {
  let res: Response
  const started = Date.now()
  const request_chars = init.body ? JSON.stringify(init.body).length : 0
  const record = (status: "ok" | "error", data?: unknown, error?: string) =>
    init.track
      ? recordAiUsage(init.track.container, {
          run_id: init.track.run_id,
          task: init.track.task,
          provider: "openrouter",
          model: init.track.model,
          ...openRouterUsage(data),
          request_chars,
          duration_ms: Date.now() - started,
          status,
          error: error ?? null,
        })
      : Promise.resolve()
  try {
    res = await fetch(`${openRouterBase()}${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.STOREFRONT_URL?.split(",")[0]?.trim() || "https://www.lalykw.com",
        "X-OpenRouter-Title": "Laly Admin",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init.timeoutMs ?? 180_000),
    })
  } catch (error) {
    await record("error", undefined, (error as Error).message)
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `OpenRouter unreachable: ${(error as Error).message}`)
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } }
  await record(!res.ok || data.error ? "error" : "ok", data, !res.ok || data.error ? data.error?.message ?? `HTTP ${res.status}` : undefined)
  if (!res.ok || data.error) {
    if (res.status === 401) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "OpenRouter rejected the API key. Check it in Integrations.")
    if (res.status === 402) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "OpenRouter: not enough credits on the account.")
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `OpenRouter: ${data.error?.message ?? `HTTP ${res.status}`}`)
  }
  return data as T
}

/** One text completion with the provider chosen for the assistant. */
export async function aiText(
  container: MedusaContainer,
  system: string,
  user: string,
  meta: { task: AiTask; runId?: string } = { task: "product_draft" }
): Promise<string> {
  const runId = meta.runId ?? newRunId()
  const s = await assistantSettings(container)
  if (!s.active) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Set up the AI provider in Integrations ← المساعد الذكي first")
  }
  if (s.provider === "openrouter") {
    const data = await openRouter<{ choices?: { message?: { content?: string | null } }[] }>(s.apiKey, "/chat/completions", {
      body: { model: s.model, messages: [{ role: "system", content: system }, { role: "user", content: user }] },
      track: { container, run_id: runId, task: meta.task, model: s.model },
    })
    return data.choices?.[0]?.message?.content ?? ""
  }
  const client = new Anthropic({ apiKey: s.apiKey })
  const started = Date.now()
  const base = { run_id: runId, task: meta.task, provider: "anthropic" as const, model: s.model, request_chars: system.length + user.length }
  try {
    // Long pages and two languages of copy: stream so the request does not time out.
    const message = await client.beta.messages
      .stream({
        model: s.model,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system,
        messages: [{ role: "user", content: user }],
      })
      .finalMessage()
    await recordAiUsage(container, { ...base, ...anthropicUsage(message.usage), duration_ms: Date.now() - started, status: "ok" })
    if (message.stop_reason === "refusal") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The model declined this request.")
    return message.content.map((b) => (b.type === "text" ? b.text : "")).join("")
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      await recordAiUsage(container, { ...base, duration_ms: Date.now() - started, status: "error", error: error.message })
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Anthropic rejected the API key. Check it in Integrations.")
    }
    if (error instanceof Anthropic.APIError) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `AI error ${error.status ?? ""}: ${error.message}`)
    }
    throw error
  }
}

/** The first JSON object in a model's answer (models sometimes wrap it in a code fence). */
export function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "The model did not return JSON")
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
  } catch (error) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `The model returned broken JSON: ${(error as Error).message}`)
  }
}

async function mediaSettings(container: MedusaContainer, kind: "image" | "video") {
  const s = await assistantSettings(container)
  const model = kind === "image" ? s.imageModel : s.videoModel
  if (!s.enabled || !s.openRouterKey || !model) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Add the OpenRouter key and the image/video model in Integrations ← المساعد الذكي")
  }
  return { key: s.openRouterKey, model }
}

/** Edits a product photo with the image model; the photo goes as a data URL. */
export async function aiEditImage(container: MedusaContainer, prompt: string, image: { bytes: Buffer; type: string }) {
  const { key, model } = await mediaSettings(container, "image")
  const data = await openRouter<{ data?: { b64_json?: string; media_type?: string }[] }>(key, "/images", {
    body: {
      model,
      prompt,
      n: 1,
      input_references: [{ type: "image_url", image_url: { url: `data:${image.type};base64,${image.bytes.toString("base64")}` } }],
    },
    track: { container, run_id: newRunId(), task: "image_edit", model },
  })
  const out = data.data?.[0]
  if (!out?.b64_json) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "The image model returned no image")
  return { bytes: Buffer.from(out.b64_json, "base64"), type: out.media_type || "image/png" }
}

export type VideoJob = { id: string; status: "pending" | "in_progress" | "completed" | "failed"; error?: string }

/** Starts an image-to-video job (asynchronous on OpenRouter). */
export async function aiStartVideo(container: MedusaContainer, prompt: string, image: { bytes: Buffer; type: string }) {
  const { key, model } = await mediaSettings(container, "video")
  const job = await openRouter<{ id: string; status: VideoJob["status"] }>(key, "/videos", {
    body: {
      model,
      prompt,
      frame_images: [
        { type: "image_url", image_url: { url: `data:${image.type};base64,${image.bytes.toString("base64")}` }, frame_type: "first_frame" },
      ],
    },
    // Submitting is free; the job's cost is recorded when it completes.
  })
  return { id: job.id, status: job.status }
}

export async function aiVideoStatus(container: MedusaContainer, id: string) {
  const { key, model } = await mediaSettings(container, "video")
  const job = await openRouter<{
    id: string
    status: VideoJob["status"]
    error?: string | { message?: string }
    usage?: { cost?: number }
  }>(key, `/videos/${encodeURIComponent(id)}`)
  if (job.status === "completed" || job.status === "failed") {
    await recordAiUsage(container, {
      run_id: `video_${id}`,
      task: "video",
      provider: "openrouter",
      model,
      cost_usd: typeof job.usage?.cost === "number" ? job.usage.cost : null,
      status: job.status === "completed" ? "ok" : "error",
    })
  }
  return { id: job.id, status: job.status, error: typeof job.error === "string" ? job.error : job.error?.message }
}

/** Downloads a finished video (the content endpoint needs the key). */
export async function aiVideoContent(container: MedusaContainer, id: string) {
  const { key } = await mediaSettings(container, "video")
  const res = await fetch(`${openRouterBase()}/videos/${encodeURIComponent(id)}/content?index=0`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Could not download the video (HTTP ${res.status})`)
  return { bytes: Buffer.from(await res.arrayBuffer()), type: (res.headers.get("content-type") ?? "video/mp4").split(";")[0] }
}
