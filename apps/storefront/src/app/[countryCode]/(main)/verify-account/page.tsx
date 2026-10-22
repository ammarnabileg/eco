import { Metadata } from "next"
import { Suspense } from "react"

import VerifyAccount from "@modules/account/components/verify-account"
import { getT } from "@i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: t("account.verify_title"),
    description: t("account.meta_verify_description"),
  }
}

export default async function VerifyAccountPage() {
  const t = await getT()
  return (
    <div className="w-full flex justify-center bg-laly-bg px-4 small:px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-laly-mut">
            {t("account.verifying")}
          </p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}
