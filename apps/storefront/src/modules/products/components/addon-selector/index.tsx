"use client"

import type { AddonGroup } from "@lib/util/catalog"
import { convertToLocale } from "@lib/util/money"

const toNumber = (v: number | string) => Number(v) || 0

/** Selected option ids per group id. */
export type AddonSelection = Record<string, string[]>

export const selectedOptionIds = (selection: AddonSelection) =>
  Object.values(selection).flat()

export const addonsTotal = (
  groups: AddonGroup[],
  selection: AddonSelection
) => {
  const ids = new Set(selectedOptionIds(selection))
  const fils = groups
    .flatMap((g) => g.options ?? [])
    .filter((o) => ids.has(o.id))
    .reduce((sum, o) => sum + Math.round(toNumber(o.price) * 1000), 0)
  return fils / 1000
}

export const missingRequired = (
  groups: AddonGroup[],
  selection: AddonSelection
) => groups.filter((g) => g.is_required && !selection[g.id]?.length)

/**
 * Optional parts sold with the product (RAM, SSD, HDD...). Single-choice
 * groups are radios with a "none" choice unless required; multiple-choice
 * groups are checkboxes. Prices here are for display; the server re-prices.
 */
export default function AddonSelector({
  groups,
  selection,
  onChange,
  currencyCode,
  disabled,
}: {
  groups: AddonGroup[]
  selection: AddonSelection
  onChange: (next: AddonSelection) => void
  currencyCode: string
  disabled?: boolean
}) {
  if (!groups.length) {
    return null
  }

  const price = (v: number | string) =>
    `+ ${convertToLocale({ amount: toNumber(v), currency_code: currencyCode })}`

  const optionClass = (checked: boolean) =>
    `flex items-center gap-3 rounded-btn border-[1.6px] px-3 py-2.5 cursor-pointer transition-colors ${
      checked
        ? "border-laly-teal bg-laly-teal-faint"
        : "border-laly-line hover:border-laly-teal"
    }`

  return (
    <div className="flex flex-col gap-4" data-testid="addon-selector">
      {groups.map((group) => {
        const current = selection[group.id] ?? []
        const single = group.selection === "single"
        const set = (ids: string[]) =>
          onChange({ ...selection, [group.id]: ids })

        return (
          <fieldset
            key={group.id}
            disabled={disabled}
            className="flex flex-col gap-2"
          >
            <legend className="mb-2 text-sm font-extrabold">
              {group.name_ar}
              {group.is_required ? (
                <span className="text-laly-red"> *</span>
              ) : (
                <span className="ms-1.5 text-xs font-bold text-laly-faint">
                  (اختياري)
                </span>
              )}
            </legend>
            {single && !group.is_required && (
              <label className={optionClass(current.length === 0)}>
                <input
                  type="radio"
                  name={`addon-${group.id}`}
                  checked={current.length === 0}
                  onChange={() => set([])}
                  className="w-4 h-4 accent-laly-teal"
                />
                <span className="flex-1 text-sm">بدون</span>
              </label>
            )}
            {(group.options ?? []).map((option) => {
              const checked = current.includes(option.id)
              return (
                <label key={option.id} className={optionClass(checked)}>
                  <input
                    type={single ? "radio" : "checkbox"}
                    name={`addon-${group.id}`}
                    checked={checked}
                    onChange={() =>
                      set(
                        single
                          ? [option.id]
                          : checked
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id]
                      )
                    }
                    className="w-4 h-4 accent-laly-teal"
                    data-testid="addon-option"
                  />
                  <span className="flex-1 text-sm" dir="auto">
                    {option.name_ar}
                  </span>
                  <span className="text-sm font-bold text-laly-teal tabular-nums">
                    {price(option.price)}
                  </span>
                </label>
              )
            })}
          </fieldset>
        )
      })}
    </div>
  )
}
