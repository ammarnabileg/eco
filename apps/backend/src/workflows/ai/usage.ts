import { randomUUID } from "node:crypto"

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { AI_MODULE } from "../../modules/ai"
import AiModuleService from "../../modules/ai/service"

// Recording what each AI request cost. Recording never breaks the request it
// describes: a failure here is only logged.

export type AiTask =
  | "admin_chat"
  | "product_draft"
  | "product_category"
  | "image_edit"
  | "image_generate"
  | "video"
  | "marketing_copy"

export type UsageRow = {
  run_id: string
  task: AiTask
  provider: "openrouter" | "anthropic"
  model: string
  input_tokens?: number
  output_tokens?: number
  cached_tokens?: number
  cost_usd?: number | null
  request_chars?: number
  tool_calls?: number
  duration_ms?: number
  status: "ok" | "error"
  error?: string | null
}

const recordAiUsageStep = createStep("record-ai-usage", async (input: UsageRow, { container }) => {
  const row = await container.resolve<AiModuleService>(AI_MODULE).createAiUsages({
    ...input,
    error: input.error?.slice(0, 500) ?? null,
    cost_usd: input.cost_usd ?? null,
  })
  return new StepResponse(row.id, row.id)
}, async (id, { container }) => {
  if (id) await container.resolve<AiModuleService>(AI_MODULE).deleteAiUsages([id])
})

export const recordAiUsageWorkflow = createWorkflow("record-ai-usage", (input: UsageRow) =>
  new WorkflowResponse(recordAiUsageStep(input))
)

export const newRunId = () => `airun_${randomUUID()}`

export async function recordAiUsage(container: MedusaContainer, row: UsageRow) {
  try {
    await recordAiUsageWorkflow(container).run({ input: row })
  } catch (error) {
    container.resolve(ContainerRegistrationKeys.LOGGER).warn(`AI usage not recorded: ${(error as Error).message}`)
  }
}

/** Token and cost fields of an OpenRouter (OpenAI-format) response. */
export function openRouterUsage(data: unknown) {
  const u = (data as { usage?: Record<string, any> } | null)?.usage
  if (!u) return {}
  return {
    input_tokens: Number(u.prompt_tokens ?? 0),
    output_tokens: Number(u.completion_tokens ?? 0),
    cached_tokens: Number(u.prompt_tokens_details?.cached_tokens ?? 0),
    cost_usd: typeof u.cost === "number" ? u.cost : null,
  }
}

/** Token fields of an Anthropic response (no money amount: Anthropic reports tokens only). */
export function anthropicUsage(usage: { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null } | undefined) {
  if (!usage) return {}
  return {
    input_tokens: Number(usage.input_tokens ?? 0) + Number(usage.cache_read_input_tokens ?? 0) + Number(usage.cache_creation_input_tokens ?? 0),
    output_tokens: Number(usage.output_tokens ?? 0),
    cached_tokens: Number(usage.cache_read_input_tokens ?? 0),
    cost_usd: null,
  }
}
