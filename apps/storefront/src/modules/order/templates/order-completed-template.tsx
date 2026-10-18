import { Heading } from "@modules/common/components/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"
import { getPublicIntegrations } from "@lib/data/integrations"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"
  const { whatsapp } = await getPublicIntegrations()
  const whatsappNotice = whatsapp?.order === "on" && !!order.shipping_address?.phone

  return (
    <div className="py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col gap-4 max-w-4xl h-full bg-white w-full py-10"
          data-testid="order-complete-container"
        >
          <Heading
            level="h1"
            className="flex flex-col gap-y-3 text-laly-ink text-3xl mb-4"
          >
            <span>شكرًا لك!</span>
            <span className="text-laly-teal">تم تأكيد طلبك</span>
          </Heading>
          {whatsappNotice && (
            <div
              className="rounded-xl border border-laly-teal-soft bg-laly-teal-faint p-4 text-sm text-laly-ink"
              data-testid="whatsapp-order-notice"
            >
              <p className="font-bold">هتوصلك رسالة على واتساب بتفاصيل الطلب</p>
              <p className="mt-1 text-laly-mut">
                على الرقم <span dir="ltr">{order.shipping_address?.phone}</span>. رد بـ <b>1</b> لتأكيد الطلب أو{" "}
                <b>2</b> لو عايز تلغيه.
              </p>
            </div>
          )}
          <OrderDetails order={order} />
          <Heading level="h2" className="flex flex-row text-3xl-regular">
            ملخص الطلب
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          <Help />
        </div>
      </div>
    </div>
  )
}
