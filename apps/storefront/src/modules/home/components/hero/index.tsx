import type { HeroSlide } from "@lib/data/content"
import { whatsappLink } from "@lib/util/localize"
import HeroCarousel from "./carousel"

export default function Hero({
  slides,
  whatsapp,
}: {
  slides: HeroSlide[]
  whatsapp: string | null
}) {
  if (!slides.length) {
    return null
  }

  return (
    <HeroCarousel
      slides={slides}
      installHref={whatsappLink(whatsapp, "أريد حجز موعد تركيب")}
    />
  )
}
