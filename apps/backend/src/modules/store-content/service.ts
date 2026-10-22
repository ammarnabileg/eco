import { MedusaService } from "@medusajs/framework/utils"

import ContentPage from "./models/content-page"
import ContentPageRevision from "./models/content-page-revision"
import HeroSlide from "./models/hero-slide"
import SiteSetting from "./models/site-setting"
import TrustBadge from "./models/trust-badge"

class StoreContentModuleService extends MedusaService({
  SiteSetting,
  TrustBadge,
  HeroSlide,
  ContentPage,
  ContentPageRevision,
}) {
  // Slides that should be visible right now, in display order.
  async listLiveHeroSlides(now: Date = new Date()) {
    const slides = await this.listHeroSlides(
      { is_active: true },
      { order: { rank: "ASC" } }
    )
    return slides.filter(
      (s) =>
        (!s.starts_at || new Date(s.starts_at) <= now) &&
        (!s.ends_at || new Date(s.ends_at) > now)
    )
  }

  // The version customers see, or null when the page is not published.
  async getPublishedPage(slug: string) {
    const [page] = await this.listContentPages({ slug, is_published: true }, { take: 1 })
    if (!page) return null
    const [revision] = await this.listContentPageRevisions(
      { slug, version: page.version },
      { take: 1 }
    )
    return revision ? { ...revision, published_at: page.published_at } : null
  }

  // The settings row, created empty on first access.
  async getSettings() {
    const [existing] = await this.listSiteSettings({}, { take: 1 })
    return existing ?? (await this.createSiteSettings({}))
  }
}

export default StoreContentModuleService
