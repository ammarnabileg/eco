import { Metadata } from "next"
import { Suspense } from "react"

import VerifyAccount from "@modules/account/components/verify-account"

export const metadata: Metadata = {
  title: "تأكيد البريد الإلكتروني",
  description: "أكّد بريدك الإلكتروني لإكمال التسجيل.",
}

export default function VerifyAccountPage() {
  return (
    <div className="w-full flex justify-center bg-laly-bg px-4 small:px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-laly-mut">
            جاري التحقق من بريدك الإلكتروني…
          </p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}
