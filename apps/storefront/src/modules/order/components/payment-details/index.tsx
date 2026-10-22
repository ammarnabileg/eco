import { intlLocale } from "@i18n/config"
import { getLocale, getT } from "@i18n/server"
import { Container, Heading, Text } from "@modules/common/components/ui"

import { isStripeLike, paymentInfoMap } from "@lib/constants"
import Divider from "@modules/common/components/divider"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { formatOrderDateTime } from "@modules/order/util/format"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = async ({ order }: PaymentDetailsProps) => {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  const payment = order.payment_collections?.[0].payments?.[0]

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {t("order.payment")}
      </Heading>
      <div>
        {payment && (
          <div className="grid grid-cols-1 small:grid-cols-3 gap-6 w-full">
            <div className="flex flex-col">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("order.payment_method")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method"
              >
                {paymentInfoMap[payment.provider_id]
                  ? t(paymentInfoMap[payment.provider_id].titleKey)
                  : payment.provider_id}
              </Text>
            </div>
            <div className="flex flex-col small:col-span-2">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("order.payment_details")}
              </Text>
              <div className="flex gap-2 txt-medium text-ui-fg-subtle items-center">
                <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                  {paymentInfoMap[payment.provider_id]?.icon}
                </Container>
                <Text data-testid="payment-amount" dir="auto">
                  {isStripeLike(payment.provider_id) && payment.data?.card_last4
                    ? `**** **** **** ${payment.data.card_last4}`
                    : t("order.paid_on", {
                        amount: convertToLocale({
                          amount: payment.amount,
                          currency_code: order.currency_code,
                          locale: intlLocale(locale),
                        }),
                        date: formatOrderDateTime(payment.created_at, locale),
                      })}
                </Text>
              </div>
            </div>
          </div>
        )}
      </div>

      <Divider className="mt-8" />
    </div>
  )
}

export default PaymentDetails
