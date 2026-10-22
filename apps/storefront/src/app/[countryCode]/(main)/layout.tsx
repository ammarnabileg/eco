import { Metadata } from "next"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getBaseURL } from "@lib/util/env"
import { StoreCartShippingOption } from "@medusajs/types"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import BottomNav from "@modules/laly/components/bottom-nav"
import WhatsAppButton from "@modules/laly/components/whatsapp-button"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"
import CompareTray from "@modules/tools/components/compare-tray"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const customer = await retrieveCustomer()
  const cart = await retrieveCart()
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()

    shippingOptions = shipping_options
  }

  return (
    <>
      <Nav />
      {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}

      {cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      {props.children}
      {/* Room above the phone's bottom navigation / action bar. */}
      <div aria-hidden className="small:hidden h-[calc(84px+env(safe-area-inset-bottom))]" />
      <Footer />
      <WhatsAppButton />
      <CompareTray />
      <BottomNav
        cartCount={cart?.items?.reduce((n, item) => n + item.quantity, 0) ?? 0}
      />
    </>
  )
}
