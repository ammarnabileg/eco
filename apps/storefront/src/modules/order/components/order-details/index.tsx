import { getLocale, getT } from "@i18n/server"
import { richText } from "@lib/util/rich-text"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import {
  formatFulfillmentStatus,
  formatOrderDate,
  formatPaymentStatus,
} from "@modules/order/util/format"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = async ({ order, showStatus }: OrderDetailsProps) => {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  return (
    <div>
      <Text className="text-laly-mut">
        {richText(t("order.confirmation_sent_to"), {
          email: (
            <span
              className="text-laly-ink font-semibold"
              dir="ltr"
              data-testid="order-email"
            >
              {order.email}
            </span>
          ),
        })}
      </Text>
      <Text className="mt-2 text-laly-mut">
        {t("order.order_date")}{" "}
        <span className="text-laly-ink" data-testid="order-date">
          {formatOrderDate(order.created_at, undefined, locale)}
        </span>
      </Text>
      <Text className="mt-2 text-laly-teal font-semibold">
        {t("order.order_number")} <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex flex-wrap items-center text-compact-small gap-x-4 gap-y-2 mt-4">
        {showStatus && (
          <>
            <Text className="text-laly-mut">
              {t("order.order_status")}{" "}
              <span
                className="inline-flex px-2 py-0.5 rounded-full bg-laly-teal-soft text-laly-teal-d font-semibold"
                data-testid="order-status"
              >
                {formatFulfillmentStatus(order.fulfillment_status, t)}
              </span>
            </Text>
            <Text className="text-laly-mut">
              {t("order.payment_status")}{" "}
              <span
                className="inline-flex px-2 py-0.5 rounded-full bg-laly-bg text-laly-ink font-semibold"
                sata-testid="order-payment-status"
              >
                {formatPaymentStatus(order.payment_status, t)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
