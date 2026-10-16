import { Metadata } from "next"

import { getStoreContent } from "@lib/data/content"
import { whatsappLink } from "@lib/util/localize"
import Icon, { type IconName } from "@modules/laly/components/icon"

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "طرق التواصل مع فريق Laly وخدمة العملاء.",
}

// All details come from the admin (Store content > Contact).
export default async function ContactPage() {
  const { settings } = await getStoreContent()
  const whatsapp = whatsappLink(settings.whatsapp)

  const rows: { icon: IconName; label: string; value: string; href?: string; ltr?: boolean }[] = [
    whatsapp && settings.whatsapp
      ? { icon: "chat" as IconName, label: "واتساب", value: settings.whatsapp, href: whatsapp, ltr: true }
      : null,
    settings.phone
      ? { icon: "call" as IconName, label: "الهاتف", value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, "")}`, ltr: true }
      : null,
    settings.email
      ? { icon: "mail" as IconName, label: "البريد الإلكتروني", value: settings.email, href: `mailto:${settings.email}`, ltr: true }
      : null,
    settings.address_ar ? { icon: "pin" as IconName, label: "العنوان", value: settings.address_ar } : null,
    settings.hours_ar ? { icon: "clock" as IconName, label: "ساعات العمل", value: settings.hours_ar } : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null)

  return (
    <div className="content-container py-10 small:py-16 max-w-2xl">
      <h1 className="text-2xl small:text-[32px] font-extrabold">تواصل معنا</h1>
      <p className="mt-2 text-laly-mut">فريقنا جاهز يساعدك في اختيار المنتج المناسب، التركيب، أو متابعة طلبك.</p>
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
