"use client"

import { useParams, usePathname } from "next/navigation"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon, { type IconName } from "@modules/laly/components/icon"

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "الرئيسية", icon: "smarthome" },
  { href: "/store", label: "الأقسام", icon: "grid" },
  { href: "/cart", label: "السلة", icon: "cart" },
  { href: "/account", label: "حسابي", icon: "user" },
]

// App-style navigation for phones; hidden from the `small` breakpoint up.
export default function BottomNav({ cartCount }: { cartCount: number }) {
  const pathname = usePathname()
  const { countryCode } = useParams()

  const isActive = (href: string) => {
    const full = `/${countryCode}${href === "/" ? "" : href}`
    return href === "/" ? pathname === full : pathname.startsWith(full)
  }

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="small:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-laly-line pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <li key={item.href}>
              <LocalizedClientLink
                href={item.href}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${
                  active ? "text-laly-teal" : "text-laly-mut"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span className="absolute top-0 h-[3px] w-8 rounded-b bg-laly-teal" />
                )}
                <span className="relative">
                  <Icon name={item.icon} size={22} />
                  {item.href === "/cart" && cartCount > 0 && (
                    <span className="absolute -top-1.5 -end-2 min-w-[17px] h-[17px] px-1 rounded-full bg-laly-sand text-[#26200D] text-[10px] font-extrabold flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </span>
                {item.label}
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
