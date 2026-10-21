import Anthropic from "@anthropic-ai/sdk"
import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { INTEGRATIONS_MODULE } from "../../modules/integrations"
import IntegrationsModuleService from "../../modules/integrations/service"
import { resolveIntegration } from "../../modules/integrations/store"
import { Action, assistantTools, runTool } from "./tools"

// The admin assistant: one chat turn runs the model with the store tools until
// it answers. Two providers: Anthropic (Claude, directly) and OpenRouter (any
// model with tool calling, OpenAI chat format). The conversation lives in the
// admin's browser and is sent back each turn unchanged (thinking blocks
// included); its format belongs to the provider that produced it.

export type Provider = "anthropic" | "openrouter"
export type ChatMessage = Anthropic.Beta.BetaMessageParam
type TurnResult = { messages: unknown[]; reply: string; actions: Action[]; provider: Provider }

const MAX_STEPS = 10
const RESULT_LIMIT = 20_000

const SYSTEM = `You are the admin assistant of Laly, an electronics store in Kuwait (prices in KWD with 3 decimals).
You help the store staff in the admin panel: look up products, orders and sales, and prepare changes to products and prices.

How you work:
- Reply in the language the staff member writes in (usually Arabic, Egyptian or Gulf dialect). Keep answers short and concrete; use lists or small tables for numbers.
- Look things up with the tools before answering; never guess ids, prices or numbers. If a search finds nothing, say so and suggest another search word.
- Changes (set_price, adjust_prices, update_product) are proposals: the tool prepares them and the staff member applies each one with a button. After proposing, say clearly what will change and that it is applied only when they press "تنفيذ". Never claim a change is done.
- When a request is ambiguous (which product, which variant, how much), ask one short question instead of guessing.
- You cannot cancel or refund orders, contact customers or change settings; say so if asked and point to the right admin page.`

export async function assistantSettings(container: MedusaContainer) {
  const svc = container.resolve<IntegrationsModuleService>(INTEGRATIONS_MODULE)
  const r = resolveIntegration("assistant", await svc.findRow("assistant"))
  const v = r.values
  const provider: Provider = v.provider === "openrouter" ? "openrouter" : "anthropic"
  const apiKey = String((provider === "openrouter" ? v.openrouter_api_key : v.api_key) ?? "")
  const model = String((provider === "openrouter" ? v.openrouter_model : v.model) ?? "") || (provider === "anthropic" ? "claude-opus-5-5" : "")
  return {
    enabled: r.enabled,
    active: r.enabled && !!apiKey && !!model,
    provider,
    apiKey,
    model,
    // Images and video always go through OpenRouter.
    openRouterKey: String(v.openrouter_api_key ?? ""),
    imageModel: String(v.image_model ?? ""),
    videoModel: String(v.video_model ?? ""),
  }
}

const MISSING = {
  anthropic: "Add the Anthropic API key in Integrations ← المساعد الذكي first",
  openrouter: "Add the OpenRouter API key and model in Integrations ← المساعد الذكي first",
}

/** Runs the model's tool calls; failures go back to the model as errors. */
async function runCalls(container: MedusaContainer, calls: { id: string; name: string; input: unknown }[], actions: Action[]) {
  const out: { id: string; content: string; error: boolean }[] = []
  for (const call of calls) {
    try {
      const { action, result } = await runTool(container, call.name, call.input)
      if (action) actions.push(action)
      const json = JSON.stringify(result)
      out.push({ id: call.id, content: json.length > RESULT_LIMIT ? `${json.slice(0, RESULT_LIMIT)}… (truncated; narrow the request)` : json, error: false })
    } catch (error) {
      out.push({ id: call.id, content: (error as Error).message, error: true })
    }
  }
  return out
}

/** One chat turn with the configured provider. History from another provider is dropped. */
export async function assistantTurn(
  container: MedusaContainer,
  input: { history: unknown[]; text: string; provider?: Provider | null },
  options: { client?: Anthropic } = {}
): Promise<TurnResult> {
  const settings = await assistantSettings(container)
  if (!settings.active) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, MISSING[settings.provider])
  // Conversations from before the provider choice are Anthropic ones.
  const history = (input.provider ?? "anthropic") === settings.provider ? input.history : []
  return settings.provider === "openrouter"
    ? openRouterTurn(container, settings, history, input.text)
    : anthropicTurn(container, settings, [...(history as ChatMessage[]), { role: "user", content: input.text }], options)
}

const textOf = (content: Anthropic.Beta.BetaContentBlock[]) =>
  content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim()

async function anthropicTurn(
  container: MedusaContainer,
  settings: { apiKey: string; model: string },
  history: ChatMessage[],
  options: { client?: Anthropic }
): Promise<TurnResult> {
  const client = options.client ?? new Anthropic({ apiKey: settings.apiKey })
  const messages = [...history]
  const actions: Action[] = []
  const replies: string[] = []

  for (let step = 0; step < MAX_STEPS; step++) {
    let response: Anthropic.Beta.BetaMessage
    try {
      response = await client.beta.messages.create({
        model: settings.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        cache_control: { type: "ephemeral" },
        system: SYSTEM,
        tools: assistantTools,
        messages,
      })
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Anthropic rejected the API key. Check it in Integrations.")
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The assistant is busy (rate limit). Try again in a minute.")
      }
      if (error instanceof Anthropic.APIError) {
        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Assistant error ${error.status ?? ""}: ${error.message}`)
      }
      throw error
    }

    messages.push({ role: "assistant", content: response.content })
    const text = textOf(response.content)
    if (text) replies.push(text)

    if (response.stop_reason === "refusal") {
      replies.push("المساعد رفض الطلب ده. جرّب تصيغه بشكل تاني.")
      break
    }
    if (response.stop_reason === "pause_turn") continue
    if (response.stop_reason !== "tool_use") break

    const calls = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use")
    const results = await runCalls(container, calls, actions)
    messages.push({
      role: "user",
      content: results.map((r) => ({ type: "tool_result" as const, tool_use_id: r.id, content: r.content, ...(r.error ? { is_error: true } : {}) })),
    })
  }

  return { messages, reply: replies.join("\n\n") || NO_REPLY, actions, provider: "anthropic" }
}

const NO_REPLY = "مقدرتش أكمل الطلب ده. جرّب تاني بطلب أوضح."

// --- OpenRouter (OpenAI chat format) ------------------------------------------

type OrToolCall = { id: string; type: "function"; function: { name: string; arguments: string } }
type OrMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OrToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string }

const openRouterTools = assistantTools.map((t) => ({
  type: "function" as const,
  function: { name: t.name, description: t.description, parameters: t.input_schema },
}))

async function openRouterTurn(
  container: MedusaContainer,
  settings: { apiKey: string; model: string },
  history: unknown[],
  text: string
): Promise<TurnResult> {
  const base = (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "")
  const messages = [...(history as OrMessage[]), { role: "user", content: text } as OrMessage]
  const actions: Action[] = []
  const replies: string[] = []

  for (let step = 0; step < MAX_STEPS; step++) {
    let res: Response
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.STOREFRONT_URL?.split(",")[0]?.trim() || "https://www.lalykw.com",
          "X-OpenRouter-Title": "Laly Admin",
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [{ role: "system", content: SYSTEM }, ...messages],
          tools: openRouterTools,
        }),
        signal: AbortSignal.timeout(180_000),
      })
    } catch (error) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `OpenRouter unreachable: ${(error as Error).message}`)
    }
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string }
      choices?: { finish_reason?: string; message?: { content?: string | null; tool_calls?: OrToolCall[] } }[]
    }
    if (!res.ok || data.error) {
      const detail = data.error?.message ?? `HTTP ${res.status}`
      if (res.status === 401) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "OpenRouter rejected the API key. Check it in Integrations.")
      if (res.status === 402) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "OpenRouter: not enough credits on the account.")
      if (res.status === 429) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The assistant is busy (rate limit). Try again in a minute.")
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `OpenRouter error: ${detail}`)
    }
    const message = data.choices?.[0]?.message
    if (!message) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "OpenRouter returned no answer")
    const calls = message.tool_calls ?? []
    messages.push({ role: "assistant", content: message.content ?? null, ...(calls.length ? { tool_calls: calls } : {}) })
    if (message.content?.trim()) replies.push(message.content.trim())
    if (!calls.length) break

    const parsed = calls.map((c) => {
      try {
        return { id: c.id, name: c.function.name, input: JSON.parse(c.function.arguments || "{}") as unknown }
      } catch {
        return { id: c.id, name: c.function.name, input: Symbol.for("invalid") as unknown }
      }
    })
    const results = await runCalls(
      container,
      parsed.filter((p) => typeof p.input !== "symbol"),
      actions
    )
    for (const p of parsed) {
      const r = results.find((x) => x.id === p.id)
      messages.push({
        role: "tool",
        tool_call_id: p.id,
        content: r ? (r.error ? `Error: ${r.content}` : r.content) : "Error: the arguments were not valid JSON. Call the tool again.",
      })
    }
  }

  return { messages, reply: replies.join("\n\n") || NO_REPLY, actions, provider: "openrouter" }
}
