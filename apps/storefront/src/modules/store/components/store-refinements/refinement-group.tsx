"use client"

import clsx from "clsx"
import { useRefinementList } from "react-instantsearch"

import FilterCard from "@modules/store/components/filter-card"

type RefinementGroupProps = {
  attribute: string
  title: string
}

const RefinementGroup = ({ attribute, title }: RefinementGroupProps) => {
  const { items, refine } = useRefinementList({
    attribute,
    limit: 20,
    sortBy: ["count:desc", "name:asc"],
  })

  if (!items.length) {
    return null
  }

  return (
    <FilterCard title={title}>
      <ul className="flex flex-col gap-y-2.5">
        {items.map((item) => (
          <li key={item.value}>
            <label className="flex cursor-pointer items-start gap-x-2">
              <input
                type="checkbox"
                checked={item.isRefined}
                onChange={() => refine(item.value)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-laly-teal"
                data-testid={`refinement-${attribute}`}
              />
              <span
                className={clsx("text-[13px] min-w-0 break-words", {
                  "text-laly-teal font-bold": item.isRefined,
                  "text-laly-mut": !item.isRefined,
                })}
              >
                {item.label}
              </span>
              <span className="text-xs shrink-0 text-laly-faint">
                ({item.count})
              </span>
            </label>
          </li>
        ))}
      </ul>
    </FilterCard>
  )
}

export default RefinementGroup
