import { Metadata } from "next"

import { getContentPage, getStoreContent } from "@lib/data/content"
import { localize, whatsappLink } from "@lib/util/localize"
import { getLocale, getT } from "@i18n/server"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon, { type IconName } from "@modules/laly/components/icon"
import PageBanner from "@modules/laly/components/page-banner"
import HelpFaqSearch, { type HelpFaq } from "@modules/tools/components/help-faq-search"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("tools.nav_help"), description: t("tools.help_intro") }
}

type Card = { href: string; icon: IconName; title: string; text: string; external?: boolean }

// Links to what already exists; no policy text is written here.
export default async function HelpPage() {
  const [t, locale, { settings }, faq] = await Promise.all([getT(), getLocale(), getStoreContent(), getContentPage("faq")])
  const wa = whatsappLink(settings.whatsapp)
  const cards: Card[] = [
    ...(faq ? [{ href: "/faq", icon: "chat" as const, title: t("tools.help_faq"), text: t("tools.help_faq_text") }] : []),
    { href: "/track-order", icon: "truck", title: t("tools.help_track"), text: t("tools.help_track_text") },
    { href: "/returns", icon: "ret", title: t("tools.help_returns"), text: t("tools.help_returns_text") },
    { href: "/installation", icon: "wrench", title: t("tools.help_installation"), text: t("tools.help_installation_text") },
    { href: "/contact", icon: "call", title: t("tools.help_contact"), text: t("tools.help_contact_text") },
    ...(wa ? [{ href: wa, icon: "chat" as const, title: t("tools.help_whatsapp"), text: t("tools.help_whatsapp_text"), external: true }] : []),
  ]
  const items: HelpFaq[] = (faq?.faq ?? [])
    .map((f) => ({ q: localize(f, "q", locale), a: localize(f, "a", locale), group: localize(f, "group", locale) || null }))
    .filter((f) => f.q && f.a)

  const cardClass =
    "group h-full flex items-start gap-3 bg-white border border-laly-line rounded-card p-4 small:p-5 hover:border-laly-teal hover:shadow-laly transition-all"
  const inner = (c: Card) => (
    <>
      <span className="w-11 h-11 shrink-0 rounded-full bg-laly-teal-soft text-laly-teal flex items-center justify-center">
        <Icon name={c.icon} size={22} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-extrabold group-hover:text-laly-teal">{c.title}</span>
        <span className="mt-1 block text-[13px] leading-6 text-laly-mut">{c.text}</span>
      </span>
      <Icon name="arrowr" size={16} className="mt-1 shrink-0 text-laly-faint rtl:-scale-x-100" />
    </>
  )

  return (
    <>
      <PageBanner title={t("tools.nav_help")} intro={t("tools.help_intro")} />
      <div className="content-container !px-3.5 small:!px-6 py-4 small:py-10">
        <ul className="grid grid-cols-1 xsmall:grid-cols-2 medium:grid-cols-3 gap-3 small:gap-4">
          {cards.map((c) => (
            <li key={c.href}>
              {c.external ? (
                <a href={c.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                  {inner(c)}
                </a>
              ) : (
                <LocalizedClientLink href={c.href} className={cardClass}>
                  {inner(c)}
                </LocalizedClientLink>
              )}
            </li>
          ))}
        </ul>
        {items.length > 0 && <HelpFaqSearch items={items} />}
      </div>
    </>
  )
}
