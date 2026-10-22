import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import Logo from "@modules/laly/components/logo"
import { getT } from "@i18n/server"

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getT()
  return (
    <div className="w-full bg-white relative small:min-h-screen">
      <div className="h-16 bg-white border-b border-laly-line">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-sm font-bold text-laly-mut hover:text-laly-teal flex items-center gap-x-2 flex-1 basis-0"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="ltr:rotate-90 rtl:-rotate-90" size={16} />
            <span className="hidden small:block">{t("layout.back_to_cart")}</span>
            <span className="block small:hidden">{t("layout.back")}</span>
          </LocalizedClientLink>
          <Logo withTagline={false} />
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}
