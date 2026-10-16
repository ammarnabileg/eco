import { Button } from "@modules/common/components/ui"
import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { formatItemCount, formatOrderDate } from "@modules/order/util/format"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const numberOfProducts = useMemo(() => {
    return order.items?.length ?? 0
  }, [order])

  return (
    <div className="bg-white flex flex-col" data-testid="order-card">
      <div className="text-large-semi text-laly-ink mb-1">
        الطلب 
        #<span data-testid="order-display-id">{order.display_id}</span>
      </div>
      <div className="flex flex-wrap items-center divide-x rtl:divide-x-reverse divide-laly-line text-small-regular text-laly-mut">
        <span className="pe-2" data-testid="order-created-at">
          {formatOrderDate(order.created_at)}
        </span>
        <span className="px-2 text-laly-ink font-semibold" data-testid="order-amount">
          {convertToLocale({
            amount: order.total,
            currency_code: order.currency_code,
          })}
        </span>
        <span className="ps-2">{formatItemCount(numberOfLines)}</span>
      </div>
      <div className="grid grid-cols-2 small:grid-cols-4 gap-4 my-4">
        {order.items?.slice(0, 3).map((i) => {
          return (
            <div
              key={i.id}
              className="flex flex-col gap-y-2"
              data-testid="order-item"
            >
              <Thumbnail thumbnail={i.thumbnail} images={[]} size="full" />
              <div className="flex items-center text-small-regular text-laly-ink">
                <span
                  className="font-semibold line-clamp-1"
                  data-testid="item-title"
                >
                  {i.title}
                </span>
                <span className="ms-2 text-laly-mut">×</span>
                <span data-testid="item-quantity">{i.quantity}</span>
              </div>
            </div>
          )
        })}
        {numberOfProducts > 4 && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <span className="text-small-regular text-laly-ink">
              + {numberOfLines - 4}
            </span>
            <span className="text-small-regular text-laly-mut">منتجات أخرى</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
          <Button data-testid="order-details-link" variant="secondary">
            عرض التفاصيل
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard
