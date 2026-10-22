import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import MobileMenu from "../components/mobile-menu"
import { HttpTypes } from "@medusajs/types"
import { getT } from "@i18n/server"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout = async ({ customer, children }: AccountLayoutProps) => {
  const t = await getT()
  return (
    <div className="flex-1 bg-laly-bg small:py-12" data-testid="account-page">
      <div className="flex-1 content-container h-full max-w-5xl mx-auto flex flex-col">
        <div className="grid grid-cols-1 small:grid-cols-[240px_1fr] gap-6 small:gap-8 py-8 small:py-0">
          <div>{customer && <AccountNav customer={customer} />}</div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
        <MobileMenu signedIn={!!customer} />
        <div className="hidden small:flex flex-row items-center justify-between gap-6 mt-12 bg-white border border-laly-line rounded-card p-6">
          <div>
            <h3 className="text-xl font-bold text-laly-ink mb-2">
              {t("account.help_title")}
            </h3>
            <span className="txt-medium text-laly-mut">
              {t("account.help_text")}
            </span>
          </div>
          <div>
            <UnderlineLink href="/contact">{t("account.customer_service")}</UnderlineLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
