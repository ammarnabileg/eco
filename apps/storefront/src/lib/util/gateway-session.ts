import { HttpTypes } from "@medusajs/types"

/**
 * What the hosted-checkout gateways (KlickPay, Taly, Deema) need when a
 * payment session is created: where to send the customer back, and who is
 * paying (both KlickPay and Taly require an email and a phone number).
 * The backend only accepts return URLs on the storefront's own origin.
 */
export const gatewaySessionData = (
  cart: HttpTypes.StoreCart,
  countryCode: string,
  origin: string
) => {
  const address = cart.shipping_address ?? cart.billing_address
  const name = [address?.first_name, address?.last_name]
    .filter(Boolean)
    .join(" ")
  const params = new URLSearchParams({ cart_id: cart.id, country_code: countryCode })
  return {
    return_url: `${origin}/api/payment-redirect?${params}`,
    customer: {
      name: name || cart.email || "",
      email: cart.email ?? "",
      phone: cart.shipping_address?.phone || cart.billing_address?.phone || "",
    },
    locale: "ar",
  }
}
