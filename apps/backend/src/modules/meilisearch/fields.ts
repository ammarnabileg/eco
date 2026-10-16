import { SearchTypes } from "@medusajs/framework/types"

export type PlannedField = {
  path: string
  def: SearchTypes.SearchFieldDefinition
}

// Flattens an index's field definitions into dotted paths (nested object
// fields become "parent.child"), the form Meilisearch settings and filters use.
export function planFields(
  fields: Record<string, SearchTypes.SearchFieldDefinition>,
  prefix = ""
): PlannedField[] {
  return Object.entries(fields).flatMap(([name, def]) => {
    const path = prefix ? `${prefix}.${name}` : name
    if (def.type === "object" && def.fields) {
      return planFields(def.fields, path)
    }
    return [{ path, def }]
  })
}

export const weightOf = (def: SearchTypes.SearchFieldDefinition) =>
  typeof def.searchable === "object" ? (def.searchable.weight ?? 1) : def.searchable ? 1 : 0

export const dateFields = (planned: PlannedField[]) =>
  new Set(planned.filter((f) => f.def.type === "date").map((f) => f.path))
