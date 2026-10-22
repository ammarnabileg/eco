import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { STORE_CONTENT_MODULE } from "../../../../../modules/store-content"
import { CONTENT_PAGES, knownSlug } from "../../../../../modules/store-content/pages"
import StoreContentModuleService from "../../../../../modules/store-content/service"
import { savePageDraftWorkflow } from "../../../../../workflows/store-content/pages"
import { SavePageType } from "../../validators"

// The draft plus the published history (newest first).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const slug = knownSlug(req.params.slug)
  const service: StoreContentModuleService = req.scope.resolve(STORE_CONTENT_MODULE)
  const [page] = await service.listContentPages({ slug }, { take: 1 })
  const revisions = await service.listContentPageRevisions(
    { slug },
    { take: 30, order: { version: "DESC" }, select: ["id", "version", "title_ar", "published_by", "created_at"] }
  )
  res.json({ page: page ?? null, definition: CONTENT_PAGES.find((p) => p.slug === slug), revisions })
}

export async function POST(req: MedusaRequest<SavePageType>, res: MedusaResponse) {
  const slug = knownSlug(req.params.slug)
  const { result } = await savePageDraftWorkflow(req.scope).run({ input: { ...req.validatedBody, slug } })
  res.json({ page: result })
}
