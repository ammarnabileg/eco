import { nonEmptyCategories } from "@lib/util/categories"
import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import Logo from "@modules/laly/components/logo"
import { getStoreContent } from "@lib/data/content"
import { whatsappLink } from "@lib/util/localize"
import { PAYMENT_METHODS } from "@modules/laly/lib/content"

const CARE_LINKS = [
  { href: "/account/orders", label: "تتبع الطلب" },
  { href: "/account", label: "حسابي" },
  { href: "/contact", label: "تواصل معنا" },
]
// Information pages, linked only once they are published in the admin.
const CARE_PAGES = ["faq", "shipping-policy", "return-policy", "warranty", "about"]
const LEGAL_PAGES = ["privacy-policy", "terms"]

export default async function Footer() {
  const [categories, { settings, pages = [] }] = await Promise.all([
    listCategories().catch(() => []),
    getStoreContent(),
  ])
  const whatsapp = whatsappLink(settings.whatsapp)
  const published = (slugs: string[]) =>
    slugs.flatMap((slug) => pages.filter((p) => p.slug === slug)).map((p) => ({ href: `/${p.slug}`, label: p.title_ar }))
  const careLinks = [...CARE_LINKS.slice(0, 1), ...published(CARE_PAGES), ...CARE_LINKS.slice(1)]
  const legalLinks = published(LEGAL_PAGES)
  const topLevel = nonEmptyCategories(categories)
    .filter((c) => !c.parent_category)
    .slice(0, 6)

  // Phones get these links on the account tab instead, like the app design.
  return (
    <footer className="hidden small:block bg-laly-deep text-[#B9D3D8] mt-16">
      <div className="content-container grid gap-10 py-12 small:py-14 small:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo inverted withTagline={false} />
          <p className="mt-4 text-[13.5px] leading-7 max-w-sm">
            متجر كويتي متخصص في أنظمة المراقبة والشبكات والبيت الذكي — منتجات
            أصلية بضمان، وخدمة تركيب في جميع المحافظات.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="طرق الدفع">
            {PAYMENT_METHODS.map((m) => (
              <li
                key={m}
                dir="ltr"
                className="font-latin text-[11.5px] font-bold text-laly-deep bg-white rounded-md px-3 py-1.5"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-extrabold mb-4">تسوّق</h3>
          <ul className="grid gap-2.5 text-[13.5px]" data-testid="footer-categories">
            {topLevel.map((c) => (
              <li key={c.id}>
                <LocalizedClientLink
                  href={`/categories/${c.handle}`}
                  className="hover:text-white"
                  data-testid="category-link"
                >
                  {c.name}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-extrabold mb-4">خدمة العملاء</h3>
          <ul className="grid gap-2.5 text-[13.5px]">
            {careLinks.map((l) => (
              <li key={l.href}>
                <LocalizedClientLink href={l.href} className="hover:text-white">
                  {l.label}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-extrabold mb-4">تواصل معنا</h3>
          <ul className="grid gap-3 text-[13.5px]">
            {settings.phone && (
              <li>
                <a
                  href={`tel:${settings.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2.5 hover:text-white"
                >
                  <Icon name="call" size={16} className="text-laly-sand" />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              </li>
            )}
            {whatsapp && (
              <li>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 hover:text-white"
                >
                  <Icon name="chat" size={16} className="text-laly-sand" />
                  واتساب
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-2.5 hover:text-white"
                >
                  <Icon name="mail" size={16} className="text-laly-sand" />
                  {settings.email}
                </a>
              </li>
            )}
            {settings.address_ar && (
              <li className="flex items-center gap-2.5">
                <Icon name="pin" size={16} className="text-laly-sand" />
                {settings.address_ar}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="content-container py-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} Laly — جميع الحقوق محفوظة</p>
          {legalLinks.length > 0 && (
            <ul className="flex flex-wrap gap-4">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <LocalizedClientLink href={l.href} className="hover:text-white">
                    {l.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  )
}
