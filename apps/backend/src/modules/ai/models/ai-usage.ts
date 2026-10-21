import { model } from "@medusajs/framework/utils"

// One row per paid AI request (text, image or video), for cost tracking.
// `run_id` groups the requests of one chat turn or one product draft.
// No prompts, answers or customer data are kept here.
const AiUsage = model
  .define("ai_usage", {
    id: model.id({ prefix: "aiuse" }).primaryKey(),
    run_id: model.text(),
    task: model.text(),
    provider: model.text(),
    model: model.text(),
    input_tokens: model.number().default(0),
    output_tokens: model.number().default(0),
    cached_tokens: model.number().default(0),
    /** As reported by the provider (OpenRouter credits = USD); null when unknown. */
    cost_usd: model.float().nullable(),
    /** Characters we sent, our own measure when a provider reports no tokens. */
    request_chars: model.number().default(0),
    tool_calls: model.number().default(0),
    duration_ms: model.number().default(0),
    status: model.enum(["ok", "error"]),
    error: model.text().nullable(),
  })
  .indexes([{ on: ["created_at"] }, { on: ["task", "created_at"] }, { on: ["run_id"] }])

export default AiUsage
