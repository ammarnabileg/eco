import { getStoreContent } from "@lib/data/content"
import { whatsappLink } from "@lib/util/localize"
import Icon from "@modules/laly/components/icon"

export default async function WhatsAppButton() {
  const { settings } = await getStoreContent()
  const href = whatsappLink(settings.whatsapp)
  if (!href) {
    return null
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      className="fixed z-40 end-4 bottom-20 small:bottom-6 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_12px_28px_-10px_rgba(37,211,102,.7)] hover:scale-105 transition-transform"
    >
      <Icon name="chat" size={26} />
    </a>
  )
}
