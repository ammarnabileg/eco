import { Button } from "@modules/common/components/ui"
import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { useLocale, useT } from "@i18n/client"
import { intlLocale } from "@i18n/config"
import type { Translate } from "@i18n/translate"

// Arabic counts: 1 and 2 have their own words, 3-10 take the plural, 11+ the singular.
const itemCount = (t: Translate, count: number) =>
  count === 1
    ? t("account.items_one")
    : count === 2
      ? t("account.items_two")
      : count >= 3 && count <= 10
        ? t("account.items_few", { count })
        : t("account.items_many", { count })

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const t = useT()
  const locale = useLocale()
  const [titleBefore, titleAfter = ""] = t("account.order_title").split("{id}")
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
        {titleBefore}
        <span data-testid="order-display-id">{order.display_id}</span>
        {titleAfter}
      </div>
      <div className="flex flex-wrap items-center divide-x rtl:divide-x-reverse divide-laly-line text-small-regular text-laly-mut">
        <span className="pe-2" data-testid="order-created-at">
          {new Date(order.created_at).toLocaleDateString(intlLocale(locale), {
            timeZone: "Asia/Kuwait",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <span className="px-2 text-laly-ink font-semibold" data-testid="order-amount">
          {convertToLocale({
            amount: order.total,
            currency_code: order.currency_code,
            locale: intlLocale(locale),
          })}
        </span>
        <span className="ps-2">{itemCount(t, numberOfLines)}</span>
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
            <span className="text-small-regular text-laly-mut">{t("account.more_products")}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
          <Button data-testid="order-details-link" variant="secondary">
            {t("account.view_details")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard
