import { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import Divider from "@modules/common/components/divider"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export const metadata: Metadata = {
  title: "الطلبات",
  description: "استعرض طلباتك السابقة.",
}

export default async function Orders() {
  const orders = await listOrders()

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl font-bold text-laly-ink">الطلبات</h1>
        <p className="text-base-regular text-laly-mut">
          استعرض طلباتك السابقة وحالتها. ويمكنك أيضًا طلب إرجاع أو استبدال
          عند الحاجة.
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
