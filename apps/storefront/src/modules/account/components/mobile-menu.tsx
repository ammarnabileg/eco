import { Suspense } from "react"

import { getLocale, getT } from "@i18n/server"
import { getStoreContent } from "@lib/data/content"
import { localize } from "@lib/util/localize"
import LocaleSwitch from "@modules/layout/components/locale-switch"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon, { type IconName } from "@modules/laly/components/icon"

const PAGE_ICONS: Record<string, IconName> = {
  faq: "chat",
  "shipping-policy": "truck",
  "return-policy": "ret",
  warranty: "shield",
  about: "smarthome",
  "privacy-policy": "shield",
  terms: "check",
}
const ORDER = ["faq", "shipping-policy", "return-policy", "warranty", "about", "privacy-policy", "terms"]

function Row({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <li>
      <LocalizedClientLink href={href} className="flex items-center gap-3 bg-white border border-laly-line rounded-card p-3.5 active:bg-laly-teal-faint">
        <span className="w-10 h-10 rounded-[12px] bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
          <Icon name={icon} size={19} />
        </span>
        <span className="flex-1 font-bold text-[14.5px] text-laly-ink">{label}</span>
        <Icon name="chevr" size={18} className="text-laly-mut rtl:-scale-x-100" />
      </LocalizedClientLink>
    </li>
  )
}

// On phones the footer is hidden; its help and policy links live here.
export default async function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const { pages = [] } = await getStoreContent()
  const t = await getT()
  const locale = await getLocale()
  const published = ORDER.flatMap((slug) => pages.filter((p) => p.slug === slug))
  return (
    <nav aria-label={t("account.mobile_menu_label")} className="small:hidden grid gap-2.5 mt-6">
      <ul className="grid gap-2.5">
        {signedIn && <Row href="/account/orders" icon="truck" label={t("account.my_orders")} />}
        <Row href="/track-order" icon="truck" label={t("aftersales.nav_track")} />
        <Row href="/returns" icon="ret" label={t("aftersales.nav_returns")} />
        {signedIn && <Row href="/account/support" icon="headset" label={t("aftersales.nav_my_requests")} />}
        <Row href="/wishlist" icon="check" label={t("tools.nav_wishlist")} />
        <Row href="/compare" icon="grid" label={t("tools.nav_compare")} />
        <Row href="/installation" icon="wrench" label={t("service.nav")} />
        <Row href="/help" icon="chat" label={t("tools.nav_help")} />
        <Row href="/contact" icon="headset" label={t("account.contact_us")} />
      </ul>
      {published.length > 0 && (
        <>
          <p className="mt-3 text-xs font-bold text-laly-mut">{t("account.info_policies")}</p>
          <ul className="grid gap-2.5">
            {published.map((p) => (
              <Row key={p.slug} href={`/${p.slug}`} icon={PAGE_ICONS[p.slug] ?? "check"} label={localize(p, "title", locale)} />
            ))}
          </ul>
        </>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 bg-white border border-laly-line rounded-card p-3.5">
        <span className="font-bold text-[14.5px] text-laly-ink">{t("account.language")}</span>
        <Suspense>
          <LocaleSwitch variant="segmented" />
        </Suspense>
      </div>
      <p className="mt-4 text-center text-[11.5px] text-laly-mut">{t("account.copyright", { year: new Date().getFullYear() })}</p>
    </nav>
  )
}
