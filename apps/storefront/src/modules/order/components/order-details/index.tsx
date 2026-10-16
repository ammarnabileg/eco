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

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  return (
    <div>
      <Text className="text-laly-mut">
        أرسلنا تفاصيل تأكيد الطلب إلى{" "}
        <span
          className="text-laly-ink font-semibold"
          dir="ltr"
          data-testid="order-email"
        >
          {order.email}
        </span>
        .
      </Text>
      <Text className="mt-2 text-laly-mut">
        تاريخ الطلب:{" "}
        <span className="text-laly-ink" data-testid="order-date">
          {formatOrderDate(order.created_at)}
        </span>
      </Text>
      <Text className="mt-2 text-laly-teal font-semibold">
        رقم الطلب: <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex flex-wrap items-center text-compact-small gap-x-4 gap-y-2 mt-4">
        {showStatus && (
          <>
            <Text className="text-laly-mut">
              حالة الطلب:{" "}
              <span
                className="inline-flex px-2 py-0.5 rounded-full bg-laly-teal-soft text-laly-teal-d font-semibold"
                data-testid="order-status"
              >
                {formatFulfillmentStatus(order.fulfillment_status)}
              </span>
            </Text>
            <Text className="text-laly-mut">
              حالة الدفع:{" "}
              <span
                className="inline-flex px-2 py-0.5 rounded-full bg-laly-bg text-laly-ink font-semibold"
                sata-testid="order-payment-status"
              >
                {formatPaymentStatus(order.payment_status)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
