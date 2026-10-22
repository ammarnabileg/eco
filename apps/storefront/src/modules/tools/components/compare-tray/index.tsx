"use client"

import Image from "next/image"
import { useParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { useT } from "@i18n/client"
import { getToolProducts, ToolProduct } from "@lib/data/tools"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CompareIcon } from "@modules/tools/components/compare-button"
import { COMPARE_KEY, useSavedIds } from "@modules/tools/lib/saved-ids"

/** Floating bar with the products picked for comparison (hidden on /compare itself). */
export default function CompareTray() {
  const t = useT()
  const { countryCode } = useParams() as { countryCode: string }
  const pathname = usePathname()
  const { ids, ready, remove, clear, max } = useSavedIds(COMPARE_KEY)
  const [items, setItems] = useState<ToolProduct[]>([])
  const key = ids.join(",")

  useEffect(() => {
    if (!ids.length) {
      setItems([])
      return
    }
    let live = true
    getToolProducts(ids, countryCode)
      .then((p) => live && setItems(p))
      .catch(() => undefined)
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, countryCode])

  if (!ready || !ids.length || /\/compare\/?$/.test(pathname)) return null

  const byId = new Map(items.map((p) => [p.id, p]))

  return (
    <aside
      aria-label={t("tools.compare_tray")}
      className="fixed z-40 inset-x-3 bottom-[calc(148px+env(safe-area-inset-bottom))] small:inset-x-auto small:start-6 small:bottom-6 small:w-[560px] bg-white border border-laly-line rounded-card shadow-laly p-2.5 small:p-3 flex items-center gap-2 small:gap-3"
    >
      <ul className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
        {ids.map((id) => {
          const p = byId.get(id)
          return (
            <li key={id} className="relative shrink-0">
              <span className="relative block w-11 h-11 small:w-12 small:h-12 rounded-[10px] bg-laly-bg border border-laly-line overflow-hidden">
                {p?.thumbnail && <Image src={p.thumbnail} alt={p.title} fill sizes="48px" className="object-contain p-1" />}
              </span>
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={t("tools.remove_item", { name: p?.title ?? "" })}
                className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-laly-ink text-white text-[12px] leading-none flex items-center justify-center"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
      <p className="hidden small:block text-[12.5px] text-laly-mut whitespace-nowrap">
        {t("tools.compare_count", { count: ids.length, max })}
      </p>
      <div className="ms-auto flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={clear} className="h-10 px-2.5 text-[12.5px] font-bold text-laly-mut hover:text-laly-red">
          {t("tools.clear")}
        </button>
        {ids.length >= 2 ? (
          <LocalizedClientLink
            href="/compare"
            className="h-10 px-4 rounded-btn inline-flex items-center gap-1.5 bg-laly-teal text-white text-[13px] font-bold hover:bg-laly-teal-d"
          >
            <CompareIcon size={16} />
            {t("tools.compare_cta")}
          </LocalizedClientLink>
        ) : (
          <span className="h-10 px-3 rounded-btn inline-flex items-center bg-laly-line text-laly-mut text-[12px] font-bold">
            {t("tools.compare_pick_more")}
          </span>
        )}
      </div>
    </aside>
  )
}
