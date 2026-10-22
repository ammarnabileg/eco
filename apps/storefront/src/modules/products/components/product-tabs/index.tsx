"use client"

import { KeyboardEvent, ReactNode, useId, useRef, useState } from "react"

export type ProductTab = { id: string; title: string; body: ReactNode }

/**
 * WAI-ARIA tabs (automatic activation): arrows move between tabs, Home/End
 * jump to the ends, and in RTL the arrows follow the reading direction.
 * Every panel stays in the HTML (inactive ones `hidden`) so search engines
 * and in-page find still see all of it. On phones the tab bar scrolls
 * sideways.
 */
export default function ProductTabs({
  tabs,
  label,
}: {
  tabs: ProductTab[]
  label: string
}) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const base = useId()

  if (!tabs.length) return null

  const select = (index: number) => {
    const next = (index + tabs.length) % tabs.length
    setActive(next)
    const el = refs.current[next]
    el?.focus()
    el?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl"
    const forward = rtl ? "ArrowLeft" : "ArrowRight"
    const back = rtl ? "ArrowRight" : "ArrowLeft"
    if (e.key === forward) select(active + 1)
    else if (e.key === back) select(active - 1)
    else if (e.key === "Home") select(0)
    else if (e.key === "End") select(tabs.length - 1)
    else return
    e.preventDefault()
  }

  return (
    <div
      className="bg-white border border-laly-line rounded-card"
      data-testid="product-tabs"
    >
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-1 overflow-x-auto overscroll-x-contain border-b border-laly-line px-3 small:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, i) => {
          const selected = i === active
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onKeyDown}
              className={`relative shrink-0 whitespace-nowrap px-3 py-3.5 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laly-teal rounded-t-[8px] ${
                selected
                  ? "text-laly-teal"
                  : "text-laly-mut hover:text-laly-ink"
              }`}
              data-testid={`product-tab-${tab.id}`}
            >
              {tab.title}
              <span
                aria-hidden="true"
                className={`absolute inset-x-2 bottom-0 h-[3px] rounded-full ${
                  selected ? "bg-laly-teal" : "bg-transparent"
                }`}
              />
            </button>
          )
        })}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          tabIndex={0}
          hidden={i !== active}
          className="px-4 py-5 small:px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-laly-teal rounded-b-card"
          data-testid={`product-panel-${tab.id}`}
        >
          {tab.body}
        </div>
      ))}
    </div>
  )
}
