import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { STORE_CONTENT_MODULE } from "../../../../modules/store-content"
import { CONTENT_PAGES } from "../../../../modules/store-content/pages"
import StoreContentModuleService from "../../../../modules/store-content/service"

// Every page the store can have, written or not, with its publish state.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: StoreContentModuleService = req.scope.resolve(STORE_CONTENT_MODULE)
  const rows = await service.listContentPages({}, { take: 100 })
  const pages = CONTENT_PAGES.map((p) => {
    const row = rows.find((r) => r.slug === p.slug)
    return {
      ...p,
      title_ar: row?.title_ar ?? null,
      is_published: row?.is_published ?? false,
      version: row?.version ?? 0,
      published_at: row?.published_at ?? null,
      updated_at: row?.updated_at ?? null,
      has_draft_changes: row?.has_draft_changes ?? false,
    }
  })
  res.json({ pages })
}
