import { listCartShippingMethods } from "@lib/data/fulfillment"
import { filterBnplMethods } from "@lib/data/bnpl"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getOtpStatus } from "@lib/data/whatsapp"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const allMethods = (await listCartPaymentMethods(cart.region?.id ?? "")) ?? []
  // Instalments only when every product in the cart allows the gateway.
  const { methods: paymentMethods, hidden: bnplHidden } = await filterBnplMethods(cart.id, allMethods)
  // Guests confirm their phone on WhatsApp before paying (when switched on).
  const otp = await getOtpStatus(cart.id)

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment cart={cart} availablePaymentMethods={paymentMethods} bnplHidden={bnplHidden} otp={otp} />

      <Review cart={cart} />
    </div>
  )
}
