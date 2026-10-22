import { Metadata } from "next"

import { listBrands } from "@lib/data/catalog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import PageBanner from "@modules/laly/components/page-banner"

export const metadata: Metadata = {
  title: "الماركات",
  description: "الماركات المتوفرة في Laly: Hikvision و TP-Link و Tapo وغيرها، بضمان الوكيل.",
}

// Only brands the store actually sells, with how many products each has.
export default async function BrandsPage() {
  const brands = await listBrands()

  return (
    <>
      <PageBanner title="الماركات" intro="كل الماركات المتوفرة عندنا. اختار الماركة وشوف منتجاتها." />
      <div className="content-container !px-3.5 small:!px-6 py-4 small:py-12">
        {brands.length === 0 ? (
          <p className="py-16 text-center text-laly-mut">لا توجد ماركات حالياً.</p>
        ) : (
          <ul className="grid grid-cols-2 xsmall:grid-cols-3 medium:grid-cols-5 gap-3 small:gap-4">
            {brands.map((b) => (
              <li key={b.id}>
                <LocalizedClientLink
                  href={`/brands/${b.handle}`}
                  className="group h-full flex flex-col items-center justify-center gap-2 text-center bg-white border border-laly-line rounded-card px-3 py-6 small:py-8 hover:border-laly-teal hover:shadow-laly transition-all"
                >
                  {b.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo_url} alt={b.name} className="h-10 w-auto max-w-[80%] object-contain" />
                  ) : (
                    <span dir="ltr" className="font-latin text-[19px] small:text-[22px] font-extrabold text-laly-ink group-hover:text-laly-teal">
                      {b.name}
                    </span>
                  )}
                  <span className="text-[12.5px] text-laly-mut">{b.product_count} منتج</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-bold text-laly-teal">
                    تسوّق الماركة
                    <Icon name="arrowr" size={14} className="rtl:-scale-x-100" />
                  </span>
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
