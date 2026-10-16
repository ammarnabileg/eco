import { Metadata } from "next"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  description: "الصفحة التي تبحث عنها غير موجودة.",
}

export default async function NotFound() {
  return (
    <div className="content-container flex flex-col gap-3 items-center justify-center text-center min-h-[calc(100vh-64px)] py-16">
      <span
        dir="ltr"
        className="text-[64px] small:text-[88px] font-extrabold leading-none text-laly-teal"
      >
        404
      </span>
      <h1 className="text-xl small:text-[28px] font-extrabold text-laly-ink">
        الصفحة غير موجودة
      </h1>
      <p className="max-w-md text-sm text-laly-mut leading-relaxed">
        الصفحة التي تحاول الوصول إليها غير موجودة.
      </p>
      <LocalizedClientLink
        href="/"
        className="mt-3 h-11 px-6 inline-flex items-center gap-2 rounded-btn bg-laly-teal text-white text-sm font-bold hover:bg-laly-teal-d transition-colors"
      >
        العودة للرئيسية
        <Icon name="arrowr" size={16} className="rtl:-scale-x-100" />
      </LocalizedClientLink>
    </div>
  )
}
