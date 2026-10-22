import { Metadata } from "next"

import { getLocale, getT } from "@i18n/server"
import { getStoreContent } from "@lib/data/content"
import { localize, whatsappLink } from "@lib/util/localize"
import Icon, { type IconName } from "@modules/laly/components/icon"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: t("pages.contact_title"),
    description: t("pages.contact_description"),
  }
}

// All details come from the admin (Store content > Contact).
export default async function ContactPage() {
  const [{ settings }, t, locale] = await Promise.all([getStoreContent(), getT(), getLocale()])
  const address = localize(settings, "address", locale)
  const hours = localize(settings, "hours", locale)
  const whatsapp = whatsappLink(settings.whatsapp)

  const rows: { icon: IconName; label: string; value: string; href?: string; ltr?: boolean }[] = [
    whatsapp && settings.whatsapp
      ? { icon: "chat" as IconName, label: t("pages.contact_whatsapp"), value: settings.whatsapp, href: whatsapp, ltr: true }
      : null,
    settings.phone
      ? { icon: "call" as IconName, label: t("pages.contact_phone"), value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, "")}`, ltr: true }
      : null,
    settings.email
      ? { icon: "mail" as IconName, label: t("pages.contact_email"), value: settings.email, href: `mailto:${settings.email}`, ltr: true }
      : null,
    address ? { icon: "pin" as IconName, label: t("pages.contact_address"), value: address } : null,
    hours ? { icon: "clock" as IconName, label: t("pages.contact_hours"), value: hours } : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null)

  return (
    <div className="content-container py-10 small:py-16 max-w-2xl">
      <h1 className="text-2xl small:text-[32px] font-extrabold">{t("pages.contact_title")}</h1>
      <p className="mt-2 text-laly-mut">{t("pages.contact_intro")}</p>
      <ul className="mt-8 grid gap-3">
        {rows.map((r) => {
          const body = (
            <>
              <span className="w-11 h-11 rounded-[13px] bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
                <Icon name={r.icon} size={20} />
              </span>
              <span>
                <span className="block text-xs text-laly-mut">{r.label}</span>
                <span dir={r.ltr ? "ltr" : undefined} className="block font-bold">{r.value}</span>
              </span>
            </>
          )
          return (
            <li key={r.label}>
              {r.href ? (
                <a
                  href={r.href}
                  target={r.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-white border border-laly-line rounded-card p-4 hover:border-laly-teal transition-colors"
                >
                  {body}
                </a>
              ) : (
                <div className="flex items-center gap-4 bg-white border border-laly-line rounded-card p-4">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
