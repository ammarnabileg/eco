import { localePath, LOCALE_COOKIE } from "@i18n/config"
import { localeFromCookie } from "@i18n/server"
import { sdk } from "@lib/config"
import { placeOrder } from "@lib/data/cart"
import { getAuthHeaders, getCartId, setCartId } from "@lib/data/cookies"
import { HttpTypes } from "@medusajs/types"
import { unstable_rethrow } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

// Where KNET/cards/wallets (KlickPay), Taly and Deema send the customer
// back. Their `result` parameter is only a hint (Taly returns here even on
// cancel): completing the cart makes the backend ask the gateway for the
// real status, and only a confirmed payment becomes an order.
export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl

  const cartId = searchParams.get("cart_id") ?? ""
  const countryCode = (searchParams.get("country_code") ?? "").toLowerCase()
  const result = searchParams.get("result")
  const sessionId = searchParams.get("session_id") ?? ""

  const prefix = /^[a-z]{2}$/.test(countryCode)
    ? localePath(countryCode, localeFromCookie(req.cookies.get(LOCALE_COOKIE)?.value))
    : ""
  const backToPayment = () =>
    NextResponse.redirect(
      `${origin}${prefix}/checkout?step=payment&error=payment_failed`
    )

  if (
    !/^cart_[A-Za-z0-9]+$/.test(cartId) ||
    !/^payses_[A-Za-z0-9]+$/.test(sessionId)
  ) {
    return NextResponse.redirect(`${origin}${prefix}/cart`)
  }

  // Only adopt the cart when the gateway's session belongs to it, so a
  // crafted link cannot attach someone else's cart to this browser.
  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "id,payment_collection.payment_sessions.id" },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)
  const owns = cart?.payment_collection?.payment_sessions?.some(
    (s) => s.id === sessionId
  )
  if (!owns) {
    return NextResponse.redirect(`${origin}${prefix}/cart`)
  }

  // The customer may come back in a browser that lost the cart cookie. A
  // cart the browser already has is never replaced by one from a link.
  const current = await getCartId()
  if (current && current !== cartId) {
    return NextResponse.redirect(`${origin}${prefix}/cart`)
  }
  if (!current) {
    await setCartId(cartId)
  }

  if (result === "failure") {
    return backToPayment()
  }

  try {
    // Redirects to the order confirmation when the payment is confirmed.
    await placeOrder(cartId)
  } catch (error) {
    unstable_rethrow(error)
    return backToPayment()
  }

  // The gateway has not confirmed the payment (cancelled, declined, pending).
  return backToPayment()
}
