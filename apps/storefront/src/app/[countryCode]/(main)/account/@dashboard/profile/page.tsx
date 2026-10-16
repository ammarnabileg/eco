import { Metadata } from "next"

import ProfilePhone from "@modules/account//components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "الملف الشخصي",
  description: "اعرض بيانات ملفك الشخصي وعدّلها.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl font-bold text-laly-ink">الملف الشخصي</h1>
        <p className="text-base-regular text-laly-mut">
          اعرض بياناتك الشخصية وحدّثها، بما في ذلك الاسم والبريد الإلكتروني
          ورقم الهاتف، ويمكنك أيضًا تحديث عنوان الفاتورة.
        </p>
      </div>
      <div className="flex flex-col gap-y-6 w-full bg-white border border-laly-line rounded-card p-5 small:p-6">
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
        <Divider />
        {/* <ProfilePassword customer={customer} />
        <Divider /> */}
        <ProfileBillingAddress customer={customer} regions={regions} />
      </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-laly-line" />
}
