import Icon from "@modules/laly/components/icon"
import { CONTACT } from "@modules/laly/lib/content"

export default function WhatsAppButton() {
  if (!CONTACT.whatsapp) {
    return null
  }

  return (
    <a
      href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      className="fixed z-40 end-4 bottom-20 small:bottom-6 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_12px_28px_-10px_rgba(37,211,102,.7)] hover:scale-105 transition-transform"
    >
      <Icon name="chat" size={26} />
    </a>
  )
}
