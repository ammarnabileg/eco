import { MedusaService } from "@medusajs/framework/utils"

import HeroSlide from "./models/hero-slide"
import SiteSetting from "./models/site-setting"
import TrustBadge from "./models/trust-badge"

class StoreContentModuleService extends MedusaService({
  SiteSetting,
  TrustBadge,
  HeroSlide,
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

  // The settings row, created empty on first access.
  async getSettings() {
    const [existing] = await this.listSiteSettings({}, { take: 1 })
    return existing ?? (await this.createSiteSettings({}))
  }
}

export default StoreContentModuleService
