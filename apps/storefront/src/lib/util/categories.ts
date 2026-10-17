import { HttpTypes } from "@medusajs/types"

/**
 * Categories that hold products themselves or through a sub-category. Empty
 * categories stay out of navigation until products are added to them.
 */
export function nonEmptyCategories(
  categories: HttpTypes.StoreProductCategory[]
) {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const memo = new Map<string, boolean>()

  const hasProducts = (
    c: HttpTypes.StoreProductCategory,
    depth = 0
  ): boolean => {
    if (memo.has(c.id)) {
      return memo.get(c.id)!
    }
    const own = (c.products?.length ?? 0) > 0
    const viaChildren =
      depth < 6 &&
      (c.category_children ?? []).some((child) => {
        const full = byId.get(child.id)
        return full
          ? hasProducts(full, depth + 1)
          : (child.products?.length ?? 0) > 0
      })
    memo.set(c.id, own || viaChildren)
    return own || viaChildren
  }

  return categories.filter((c) => hasProducts(c))
}

/** A category's id and the ids of every loaded sub-category below it. */
export function categoryTreeIds(
  category: HttpTypes.StoreProductCategory
): string[] {
  const ids: string[] = []
  const walk = (c: HttpTypes.StoreProductCategory, depth: number) => {
    ids.push(c.id)
    if (depth < 6) {
      ;(c.category_children ?? []).forEach((child) => walk(child, depth + 1))
    }
  }
  walk(category, 0)
  return Array.from(new Set(ids))
}
