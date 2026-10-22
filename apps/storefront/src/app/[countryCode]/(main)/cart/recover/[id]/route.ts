import { localePath, LOCALE_COOKIE } from "@i18n/config"
import { localeFromCookie } from "@i18n/server"
import { sdk } from "@lib/config"
import { setCartId } from "@lib/data/cookies"
import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

// Link in the WhatsApp abandoned-cart reminder: reopens that cart on this
// device and lands on the cart page. A finished or unknown cart goes home.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ countryCode: string; id: string }> }
) {
  const { countryCode, id } = await params
  const { origin } = req.nextUrl
  const prefix = /^[a-z]{2}$/.test(countryCode)
    ? localePath(countryCode, localeFromCookie(req.cookies.get(LOCALE_COOKIE)?.value))
    : ""
  if (!/^cart_[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.redirect(`${origin}${prefix}`)
  }
  const cart = await sdk.client
    .fetch<{ cart: HttpTypes.StoreCart }>(`/store/carts/${id}`, {
      method: "GET",
      query: { fields: "id,completed_at" },
      cache: "no-store",
    })
    .then((r) => r.cart)
    .catch(() => null)
  if (!cart || cart.completed_at) {
    return NextResponse.redirect(`${origin}${prefix}`)
  }
  await setCartId(cart.id)
  return NextResponse.redirect(`${origin}${prefix}/cart`)
}
