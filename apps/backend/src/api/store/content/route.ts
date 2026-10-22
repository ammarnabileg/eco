import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { STORE_CONTENT_MODULE } from "../../../modules/store-content"
import StoreContentModuleService from "../../../modules/store-content/service"

// Public storefront content: contact details, active trust badges, and the
// hero slides live right now. Both languages are returned; the storefront picks.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: StoreContentModuleService = req.scope.resolve(STORE_CONTENT_MODULE)

  const [settings, trustBadges, heroSlides, pages] = await Promise.all([
    service.getSettings(),
    service.listTrustBadges({ is_active: true }, { order: { rank: "ASC" } }),
    service.listLiveHeroSlides(),
    service.listContentPages({ is_published: true }, { select: ["slug", "title_ar", "title_en"], take: 50 }),
  ])

  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({
    settings,
    trust_badges: trustBadges,
    hero_slides: heroSlides,
    // Published information pages, for footer links.
    pages: pages.map((p) => ({ slug: p.slug, title_ar: p.title_ar, title_en: p.title_en })),
  })
}
