// Turns a customer's add-on choice into priced line-item metadata. Prices come
// only from the database rows passed in, never from the request.

export type AddonOptionRow = {
  id: string
  name_ar: string
  name_en: string
  price: number | string | { numeric?: number } | null
  is_active?: boolean | null
}

export type AddonGroupRow = {
  id: string
  name_ar: string
  name_en: string
  selection: "single" | "multiple"
  is_required?: boolean | null
  options?: (AddonOptionRow | null)[] | null
}

export type SelectedAddon = {
  group_id: string
  group_ar: string
  group_en: string
  option_id: string
  name_ar: string
  name_en: string
  price: number
}

// KWD has 3 decimals (fils); round sums to whole fils.
export const roundMoney = (n: number) => Math.round(n * 1000) / 1000

export const toNumber = (price: AddonOptionRow["price"]): number => {
  if (price === null || price === undefined) return 0
  if (typeof price === "object") return Number(price.numeric ?? 0)
  return Number(price)
}

export function resolveAddonSelection(
  groups: AddonGroupRow[],
  optionIds: string[]
): { selected: SelectedAddon[]; total: number; errors: string[] } {
  const errors: string[] = []
  const wanted = new Set(optionIds)
  const selected: SelectedAddon[] = []

  for (const group of groups) {
    const picked = (group.options ?? []).filter(
      (o): o is AddonOptionRow => !!o && o.is_active !== false && wanted.has(o.id)
    )
    picked.forEach((o) => wanted.delete(o.id))
    if (group.selection === "single" && picked.length > 1) {
      errors.push(`Pick one option from ${group.name_en}`)
    }
    if (group.is_required && !picked.length) {
      errors.push(`${group.name_en} is required`)
    }
    for (const o of picked) {
      selected.push({
        group_id: group.id,
        group_ar: group.name_ar,
        group_en: group.name_en,
        option_id: o.id,
        name_ar: o.name_ar,
        name_en: o.name_en,
        price: roundMoney(toNumber(o.price)),
      })
    }
  }
  if (wanted.size) {
    errors.push("Some options are not available for this product")
  }

  // A stable order makes identical configurations merge into one cart line.
  selected.sort((a, b) => a.option_id.localeCompare(b.option_id))
  const total = roundMoney(selected.reduce((sum, a) => sum + a.price, 0))
  return { selected, total, errors }
}
