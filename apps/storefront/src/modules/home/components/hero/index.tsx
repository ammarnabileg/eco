import type { HeroSlide } from "@lib/data/content"
import HeroCarousel from "./carousel"

// The secondary button opens the installation page and its booking form.
export default function Hero({ slides }: { slides: HeroSlide[]; whatsapp?: string | null }) {
  if (!slides.length) {
    return null
  }
  return <HeroCarousel slides={slides} installHref="/installation" />
}
