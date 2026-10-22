import { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import Divider from "@modules/common/components/divider"
import TransferRequestForm from "@modules/account/components/transfer-request-form"
import { getT } from "@i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: t("account.orders"),
    description: t("account.meta_orders_description"),
  }
}

export default async function Orders() {
  const orders = await listOrders()
  const t = await getT()

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl font-bold text-laly-ink">{t("account.orders")}</h1>
        <p className="text-base-regular text-laly-mut">
          {t("account.orders_intro")}
        </p>
      </div>
      <div>
        <OrderOverview orders={orders} />
        <Divider className="mb-8 mt-8" />
        <div className="bg-white border border-laly-line rounded-card p-5">
          <TransferRequestForm />
        </div>
      </div>
    </div>
  )
}
