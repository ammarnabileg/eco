import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { mergeAttributes, SpecAttribute } from "../../../modules/catalog/specs"

type Query = {
  graph: (config: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data: unknown[] }>
}

type CategoryRow = {
  id: string
  parent_category_id?: string | null
  spec_templates?: ({ attributes?: SpecAttribute[]; rank?: number } | null)[] | null
}

/**
 * Spec fields per category id, including the templates of every ancestor, so
 * a template on "Security Cameras" also applies to "Bullet Cameras".
 */
export async function attributesByCategory(
  query: Query,
  categoryIds: string[]
): Promise<Map<string, SpecAttribute[]>> {
  const rows = new Map<string, CategoryRow>()
  let pending = [...new Set(categoryIds)]
  // Walk up the tree level by level; categories are rarely deeper than 3.
  while (pending.length) {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id", "parent_category_id", "spec_templates.attributes", "spec_templates.rank"],
      filters: { id: pending },
    })
    for (const row of data as CategoryRow[]) {
      rows.set(row.id, row)
    }
    pending = (data as CategoryRow[])
      .map((r) => r.parent_category_id)
      .filter((id): id is string => Boolean(id) && !rows.has(id as string))
  }

  const result = new Map<string, SpecAttribute[]>()
  for (const id of categoryIds) {
    const chain: CategoryRow[] = []
    for (let row = rows.get(id); row && chain.length < 10; row = rows.get(row.parent_category_id ?? "")) {
      chain.push(row)
    }
    const templates = chain.flatMap((row) =>
      (row.spec_templates ?? [])
        .filter((t): t is { attributes: SpecAttribute[]; rank?: number } => !!t?.attributes)
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    )
    result.set(id, mergeAttributes(templates))
  }
  return result
}

/** The merged spec fields of a product's categories (closest category first). */
export async function productAttributes(
  container: { resolve: <T>(key: string) => T },
  productId: string
): Promise<SpecAttribute[]> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["categories.id"],
    filters: { id: productId },
  })
  const categoryIds = ((data[0] as { categories?: { id: string }[] } | undefined)?.categories ?? []).map(
    (c) => c.id
  )
  const byCategory = await attributesByCategory(query, categoryIds)
  return mergeAttributes(categoryIds.map((id) => ({ attributes: byCategory.get(id) ?? [] })))
}
