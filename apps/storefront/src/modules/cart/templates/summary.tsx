"use client"

import { intlLocale } from "@i18n/config"
import { useLocale, useT } from "@i18n/client"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({
  cart,
  layout = "desktop",
}: {
  cart: HttpTypes.StoreCart
  layout?: "mobile" | "desktop"
}) => {
  const t = useT()
  const locale = useLocale()
  const href = "/checkout?step=" + getCheckoutStep(cart)
  const checkoutButton = (extra: string) => (
    <LocalizedClientLink
      href={href}
      data-testid="checkout-button"
      className={`flex items-center justify-center gap-2 rounded-btn bg-laly-teal hover:bg-laly-teal-d text-white font-bold transition-colors ${extra}`}
    >
      {t("cart.checkout")}
      <Icon name="arrowr" size={18} className="rtl:-scale-x-100" />
    </LocalizedClientLink>
  )

  return (
    <div className="bg-white border border-laly-line rounded-card p-5 flex flex-col gap-y-4">
      <h2 className="text-lg font-extrabold">{t("cart.summary_title")}</h2>
      <DiscountCode cart={cart} />
      <CartTotals totals={cart} />
      {checkoutButton("h-12")}
      <p className="flex items-center justify-center gap-1.5 text-xs text-laly-mut">
        <Icon name="shield" size={14} />
        {t("cart.secure_payment")}
      </p>

      {layout === "mobile" && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-laly-line px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-8px_24px_-16px_rgba(20,38,44,.4)]">
          <div className="shrink-0">
            <span className="block text-xs text-laly-mut">{t("cart.total")}</span>
            <span className="text-lg font-extrabold">
              {convertToLocale({
                amount: cart.total ?? 0,
                currency_code: cart.currency_code,
                locale: intlLocale(locale),
              })}
            </span>
          </div>
          {checkoutButton("flex-1 h-12")}
        </div>
      )}
    </div>
  )
}

export default Summary
