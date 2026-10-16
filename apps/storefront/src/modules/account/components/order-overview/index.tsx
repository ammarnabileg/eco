"use client"

import { Button } from "@modules/common/components/ui"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
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
      <h2 className="text-large-semi text-laly-ink">لا توجد طلبات بعد</h2>
      <p className="text-base-regular text-laly-mut">
        لم تقم بأي طلب حتى الآن. تصفّح منتجاتنا وابدأ التسوق.
      </p>
      <div className="mt-4">
        <LocalizedClientLink href="/" passHref>
          <Button data-testid="continue-shopping-button">
            ابدأ التسوق
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderOverview
