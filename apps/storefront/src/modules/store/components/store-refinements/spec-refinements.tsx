"use client"

import { useRefinementList } from "react-instantsearch"
import clsx from "clsx"

import { labelSpecFacet, SpecAttribute } from "@lib/util/catalog"
import FilterCard from "@modules/store/components/filter-card"

import { SPECS_ATTRIBUTE } from "./attributes"

type SpecGroupView = {
  attr: SpecAttribute
  values: { value: string; label: string; count: number; isRefined: boolean }[]
}

const numeric = (a: string) => Number(a.slice(a.indexOf(":") + 1))

/**
 * One filter card per filterable spec of the category template (resolution,
 * night vision, ports...). The index stores them as "key:value" keywords.
 */
export default function SpecRefinements({
  attributes,
}: {
  attributes: SpecAttribute[]
}) {
  const { items, refine } = useRefinementList({
    attribute: SPECS_ATTRIBUTE,
    limit: 300,
    sortBy: ["name:asc"],
  })

  if (!attributes.length || !items.length) {
    return null
  }

  const groups = new Map<string, SpecGroupView>()
  for (const item of items) {
    const labelled = labelSpecFacet(item.value, attributes)
    if (!labelled) {
      continue
    }
    if (!groups.has(labelled.key)) {
      groups.set(labelled.key, { attr: labelled.attr, values: [] })
    }
    groups.get(labelled.key)!.values.push({
      value: item.value,
      label: labelled.label,
      count: item.count,
      isRefined: item.isRefined,
    })
  }

  // Template order, and numbers (2 MP, 4 MP, 8 MP) in numeric order.
  const ordered = attributes
    .map((a) => groups.get(a.key))
    .filter((g): g is SpecGroupView => !!g)
    .map((g) =>
      g.attr.type === "number"
        ? {
            ...g,
            values: [...g.values].sort(
              (a, b) => numeric(a.value) - numeric(b.value)
            ),
          }
        : g
    )

  return (
    <>
      {ordered.map((group) => (
        <FilterCard key={group.attr.key} title={group.attr.label_ar}>
          <div className="flex flex-wrap gap-2">
            {group.values.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => refine(v.value)}
                aria-pressed={v.isRefined}
                className={clsx(
                  "border text-[13px] h-9 rounded-btn px-3 flex items-center gap-x-1.5 transition-colors",
                  v.isRefined
                    ? "border-laly-teal bg-laly-teal-faint text-laly-teal font-bold"
                    : "border-laly-line text-laly-mut hover:border-laly-teal hover:text-laly-ink"
                )}
                data-testid="spec-refinement"
              >
                <span dir="auto">{v.label}</span>
                <span className="text-xs text-laly-faint">({v.count})</span>
              </button>
            ))}
          </div>
        </FilterCard>
      ))}
    </>
  )
}
