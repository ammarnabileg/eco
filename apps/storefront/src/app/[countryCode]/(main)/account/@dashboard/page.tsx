import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import { getRegion } from "@lib/data/regions"
import ForYou from "@modules/home/components/for-you"

export const metadata: Metadata = {
  title: "حسابي",
  description: "نظرة عامة على نشاط حسابك.",
}

export default async function OverviewTemplate(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)
  const customer = await retrieveCustomer().catch(() => null)
  const orders = (await listOrders().catch(() => null)) || null

  if (!customer) {
    notFound()
  }

  return (
    <>
      <Overview customer={customer} orders={orders} />
      {region && <ForYou region={region} place="account" />}
    </>
  )
}
