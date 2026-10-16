"use client"

import { useId } from "react"

import { clx } from "@modules/common/components/ui"
import FilterCard from "@modules/store/components/filter-card"

type SortRadioGroupProps = {
  title: string
  items: { value: string; label: string }[]
  value: string
  handleChange: (value: string) => void
  "data-testid"?: string
}

/** Sort choices as a radio list inside a sidebar filter card. */
const SortRadioGroup = ({
  title,
  items,
  value,
  handleChange,
  "data-testid": dataTestId,
}: SortRadioGroupProps) => {
  const name = useId()

  return (
    <FilterCard title={title}>
      <div
        role="radiogroup"
        aria-label={title}
        className="flex flex-col gap-1"
        data-testid={dataTestId}
      >
        {items.map((item) => {
          const active = item.value === value

          return (
            <label
              key={item.value}
              className={clx(
                "flex items-center gap-2.5 rounded-btn px-2.5 py-2 text-[13px] cursor-pointer transition-colors",
                active
                  ? "bg-laly-teal-faint text-laly-teal font-bold"
                  : "text-laly-mut hover:text-laly-ink hover:bg-laly-bg"
              )}
              data-testid="radio-label"
              data-active={active}
            >
              <input
                type="radio"
                name={name}
                value={item.value}
                checked={active}
                onChange={() => handleChange(item.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={clx(
                  "w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-laly-teal",
                  active ? "border-laly-teal" : "border-laly-line"
                )}
              >
                {active && (
                  <span className="w-2 h-2 rounded-full bg-laly-teal" />
                )}
              </span>
              {item.label}
            </label>
          )
        })}
      </div>
    </FilterCard>
  )
}

export default SortRadioGroup
