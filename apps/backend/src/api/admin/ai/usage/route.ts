import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { AI_MODULE } from "../../../../modules/ai"
import AiModuleService from "../../../../modules/ai/service"
import { kuwaitMonthStart, summarizeUsage, UsageRecord } from "../../../../workflows/ai/summary"

// This month's AI spending, as reported by the providers.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ai = req.scope.resolve<AiModuleService>(AI_MODULE)
  const rows = await ai.listAiUsages({ created_at: { $gte: kuwaitMonthStart() } }, { take: 50_000, order: { created_at: "DESC" } })
  res.json(summarizeUsage(rows as unknown as UsageRecord[]))
}
