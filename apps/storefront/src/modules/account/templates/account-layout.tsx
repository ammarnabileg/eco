import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import MobileMenu from "../components/mobile-menu"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
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
              هل لديك أسئلة؟
            </h3>
            <span className="txt-medium text-laly-mut">
              تجد الأسئلة الشائعة وإجاباتها في صفحة خدمة العملاء.
            </span>
          </div>
          <div>
            <UnderlineLink href="/contact">خدمة العملاء</UnderlineLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
