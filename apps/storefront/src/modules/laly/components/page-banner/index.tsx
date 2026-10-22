import { ReactNode } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Desktop page header: breadcrumbs and a title on the deep-teal band. Phones
 * skip it (the app bar already shows the title) and get the intro text only.
 */
export default function PageBanner({
  title,
  intro,
  trail = [],
  aside,
}: {
  title: string
  intro?: string | null
  trail?: { href: string; label: string }[]
  aside?: ReactNode
}) {
  return (
    <>
      <section className="hidden small:block bg-[linear-gradient(160deg,#0A2A31_0%,#0B333B_46%,#0E4652_100%)] text-white">
        <div className="content-container py-10 flex items-center gap-8">
          <div className="flex-1 min-w-0">
            <nav aria-label="مسار الصفحة" className="text-[12.5px] text-[#B9D3D8]">
              <ol className="flex items-center gap-2">
                {[{ href: "/", label: "الرئيسية" }, ...trail].map((t) => (
                  <li key={t.href} className="flex items-center gap-2">
                    <LocalizedClientLink href={t.href} className="hover:text-white">
                      {t.label}
                    </LocalizedClientLink>
                    <span aria-hidden>/</span>
                  </li>
                ))}
                <li aria-current="page" className="text-white">
                  {title}
                </li>
              </ol>
            </nav>
            <h1 className="mt-3 text-[36px] font-extrabold leading-tight">{title}</h1>
            {intro && <p className="mt-3 max-w-2xl text-[15.5px] leading-7 text-[#B9D3D8]">{intro}</p>}
          </div>
          {aside}
        </div>
      </section>
      {intro && (
        <p className="small:hidden content-container !px-3.5 pt-4 text-[14px] leading-7 text-laly-mut">{intro}</p>
      )}
    </>
  )
}
