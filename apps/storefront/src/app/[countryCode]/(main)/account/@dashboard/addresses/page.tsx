import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "العناوين",
  description: "اعرض عناوين التوصيل وعدّلها.",
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl font-bold text-laly-ink">عناوين التوصيل</h1>
        <p className="text-base-regular text-laly-mut">
          اعرض عناوين التوصيل وحدّثها، ويمكنك إضافة أي عدد من العناوين. ستظهر
          عناوينك المحفوظة عند إتمام الطلب.
        </p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
