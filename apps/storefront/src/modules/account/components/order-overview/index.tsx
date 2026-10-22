"use client"

import { Button } from "@modules/common/components/ui"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { useT } from "@i18n/client"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  const t = useT()
  if (orders?.length) {
    return (
      <div className="flex flex-col gap-y-4 w-full">
        {orders.map((o) => (
          <div
            key={o.id}
            className="bg-white border border-laly-line rounded-card p-5"
          >
            <OrderCard order={o} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center text-center gap-y-3 bg-white border border-laly-line rounded-card p-8"
      data-testid="no-orders-container"
    >
      <h2 className="text-large-semi text-laly-ink">{t("account.no_orders_title")}</h2>
      <p className="text-base-regular text-laly-mut">
        {t("account.no_orders_text")}
      </p>
      <div className="mt-4">
        <LocalizedClientLink href="/" passHref>
          <Button data-testid="continue-shopping-button">
            {t("account.start_shopping")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderOverview
