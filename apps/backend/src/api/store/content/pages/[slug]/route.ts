import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { STORE_CONTENT_MODULE } from "../../../../../modules/store-content"
import StoreContentModuleService from "../../../../../modules/store-content/service"

// The published version of an information page; drafts are never returned.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: StoreContentModuleService = req.scope.resolve(STORE_CONTENT_MODULE)
  const page = await service.getPublishedPage(req.params.slug)
  if (!page) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found")
  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({
    page: {
      slug: page.slug,
      version: page.version,
      title_ar: page.title_ar,
      title_en: page.title_en,
      summary_ar: page.summary_ar,
      summary_en: page.summary_en,
      body_ar: page.body_ar,
      body_en: page.body_en,
      faq: page.faq,
      published_at: page.published_at,
    },
  })
}
