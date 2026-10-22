import { getT } from "@i18n/server"
import type { HeroSlide } from "@lib/data/content"
import { whatsappLink } from "@lib/util/localize"
import HeroCarousel from "./carousel"

export default async function Hero({
  slides,
  whatsapp,
}: {
  slides: HeroSlide[]
  whatsapp: string | null
}) {
  if (!slides.length) {
    return null
  }
  const t = await getT()

  return (
    <HeroCarousel
      slides={slides}
      installHref={whatsappLink(whatsapp, t("home.install_whatsapp_message"))}
    />
  )
}
