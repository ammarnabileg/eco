"use client"

import { useParams, usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"

import { LOCALES } from "@i18n/config"
import Icon from "@modules/laly/components/icon"
import { useT } from "@i18n/client"

// The tabs of the bottom navigation show the logo; every other screen shows
// a back arrow and its own title, like the phone design.
const ROOTS = ["/", "/categories", "/cart", "/account"]

export default function MobileBar({ logo, search }: { logo: ReactNode; search: ReactNode }) {
  const t = useT()
  const pathname = usePathname()
  const router = useRouter()
  const { countryCode } = useParams()
  // Without the country and the language ("/kw/en/cart" → "/cart").
  const path = pathname.replace(new RegExp(`^/${countryCode}(/(${Object.keys(LOCALES).join("|")}))?(?=/|$)`), "") || "/"
  const root = ROOTS.includes(path)
  const [title, setTitle] = useState("")

  // The page title comes from the page's own metadata ("Title | Laly").
  useEffect(() => {
    const read = () => setTitle(document.title.replace(/\s*\|\s*Laly\s*$/, ""))
    read()
    const el = document.querySelector("title")
    const watcher = new MutationObserver(read)
    if (el) watcher.observe(el, { childList: true, characterData: true, subtree: true })
    return () => watcher.disconnect()
  }, [pathname])

  if (root) {
    return (
      <>
        {logo}
        <div className="ms-auto">{search}</div>
      </>
    )
  }
  return (
    <>
      <button
        type="button"
        aria-label={t("layout.back")}
        onClick={() => (window.history.length > 1 ? router.back() : router.push(`/${countryCode}`))}
        className="w-10 h-10 -ms-2 rounded-full flex items-center justify-center shrink-0 hover:bg-white/10"
      >
        <Icon name="arrowr" size={22} className="ltr:-scale-x-100" />
      </button>
      <p className="flex-1 min-w-0 truncate text-[16px] font-extrabold"><bdi>{title}</bdi></p>
    </>
  )
}
