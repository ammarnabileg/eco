import { Suspense } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import Search from "@modules/layout/components/search"
import Icon from "@modules/laly/components/icon"
import Logo from "@modules/laly/components/logo"
import MobileBar from "@modules/layout/components/mobile-bar"
import { getStoreContent } from "@lib/data/content"

const NAV_LINKS = [
  { href: "/categories", label: "الأقسام" },
  { href: "/brands", label: "الماركات" },
  { href: "/offers", label: "العروض" },
  { href: "/collections/best-sellers", label: "الأكثر مبيعاً" },
]

export default async function Nav() {
  const { settings } = await getStoreContent()

  return (
    <>
      <div className="hidden small:block bg-laly-deep text-[#BFD8DD] text-xs">
        <div className="content-container flex items-center justify-between h-[38px]">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Icon name="pin" size={14} className="opacity-75" />
              توصيل لجميع مناطق الكويت
            </span>
            {settings.hours_ar && (
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={14} className="opacity-75" />
                {settings.hours_ar}
              </span>
            )}
          </div>
          <div className="flex items-center gap-5">
            <LocalizedClientLink
              href="/account/orders"
              className="flex items-center gap-1.5 hover:text-white"
            >
              <Icon name="truck" size={14} className="opacity-75" />
              تتبع طلبك
            </LocalizedClientLink>
          </div>
        </div>
      </div>

      <div className="sticky top-0 inset-x-0 z-50">
        {/* Phones: dark app bar (logo on the tab screens, back + title elsewhere). Desktop: white bar. */}
        <header className="bg-[linear-gradient(160deg,#0A2A31_0%,#0B333B_55%,#0E4652_100%)] text-white small:bg-none small:bg-white small:text-laly-ink small:border-b small:border-laly-line">
          <nav className="content-container flex items-center gap-2 small:gap-7 h-14 small:h-[82px]">
            <div className="small:hidden flex flex-1 min-w-0 items-center gap-2">
              <MobileBar logo={<Logo inverted withTagline={false} />} search={<Search />} />
            </div>
            <div className="hidden small:block">
              <Logo />
            </div>

            <div className="hidden small:flex flex-1 justify-center">
              <Search variant="bar" />
            </div>

            <ul className="hidden medium:flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <LocalizedClientLink
                    href={link.href}
                    className="relative py-1 text-sm font-bold hover:text-laly-teal after:absolute after:bottom-0 after:start-0 after:h-[2.5px] after:w-0 after:rounded after:bg-laly-teal after:transition-all hover:after:w-full"
                  >
                    {link.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-1 small:ms-0">
              <Suspense
                fallback={
                  <LocalizedClientLink
                    href="/cart"
                    aria-label="السلة"
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    data-testid="nav-cart-link"
                  >
                    <Icon name="cart" size={22} />
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>
              <LocalizedClientLink
                href="/account"
                aria-label="حسابي"
                className="hidden small:flex w-10 h-10 rounded-full items-center justify-center hover:bg-laly-teal-soft hover:text-laly-teal"
                data-testid="nav-account-link"
              >
                <Icon name="user" size={22} />
              </LocalizedClientLink>
            </div>
          </nav>
        </header>
      </div>
    </>
  )
}
