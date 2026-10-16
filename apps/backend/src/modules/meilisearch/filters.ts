import { SearchTypes } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

// Translates Medusa SearchFilters into a Meilisearch filter expression.
// https://www.meilisearch.com/docs/learn/filtering_and_sorting/filter_expression_reference

type FieldInfo = { isArray: boolean; isDate: boolean }
export type FieldLookup = (path: string) => FieldInfo | undefined

const fail = (message: string): never => {
  throw new MedusaError(MedusaError.Types.NOT_ALLOWED, message)
}

const isOperatorMap = (value: unknown): value is SearchTypes.SearchOperatorMap<unknown> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  Object.keys(value).some((k) => k.startsWith("$"))

// Meilisearch attribute names in filters may need quoting when they contain
// characters other than letters, digits, "_", "-" and ".".
const attr = (path: string) => (/^[A-Za-z0-9_.-]+$/.test(path) ? path : JSON.stringify(path))

export function literal(value: unknown, info?: FieldInfo): string {
  if (value instanceof Date) {
    return String(value.getTime())
  }
  if (info?.isDate && typeof value === "string") {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? fail(`Invalid date "${value}"`) : String(ms)
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : fail("Non-finite number in filter")
  }
  if (typeof value === "boolean") {
    return String(value)
  }
  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  }
  return fail(`Unsupported filter value ${JSON.stringify(value)}`)
}

const list = (values: unknown[], info?: FieldInfo) =>
  `[${values.map((v) => literal(v, info)).join(", ")}]`

const and = (parts: string[]) => (parts.length === 1 ? parts[0] : parts.map((p) => `(${p})`).join(" AND "))
const or = (parts: string[]) => (parts.length === 1 ? parts[0] : parts.map((p) => `(${p})`).join(" OR "))

function fieldExpression(path: string, raw: unknown, info?: FieldInfo): string {
  const a = attr(path)

  if (raw === null) {
    return `${a} IS NULL`
  }
  if (!isOperatorMap(raw)) {
    const values = Array.isArray(raw) ? raw : [raw]
    // On an array field "a = x" matches when any element equals x.
    return values.length === 1 ? `${a} = ${literal(values[0], info)}` : `${a} IN ${list(values, info)}`
  }

  const parts = Object.entries(raw).map(([op, value]) => {
    const values = Array.isArray(value) ? value : [value]
    switch (op) {
      case "$eq":
        return value === null ? `${a} IS NULL` : `${a} = ${literal(value, info)}`
      case "$ne":
        return value === null ? `${a} IS NOT NULL` : `${a} != ${literal(value, info)}`
      case "$in":
      case "$overlaps":
        return values.length ? `${a} IN ${list(values, info)}` : "id NOT EXISTS"
      case "$nin":
        return values.length ? `${a} NOT IN ${list(values, info)}` : "id EXISTS"
      case "$lt":
        return `${a} < ${literal(value, info)}`
      case "$lte":
        return `${a} <= ${literal(value, info)}`
      case "$gt":
        return `${a} > ${literal(value, info)}`
      case "$gte":
        return `${a} >= ${literal(value, info)}`
      case "$exists":
        return value ? `${a} EXISTS` : `${a} NOT EXISTS`
      case "$contains":
        // Every listed value must be present in the array field.
        return and(values.map((v) => `${a} = ${literal(v, info)}`))
      case "$prefix":
        return `${a} STARTS WITH ${literal(value)}`
      case "$like": {
        const pattern = String(value)
        const inner = pattern.replace(/^%/, "").replace(/%$/, "")
        if (/[%_]/.test(inner)) {
          return fail(`$like patterns other than "%text%", "text%" or "%text" are not supported ("${pattern}")`)
        }
        return pattern.endsWith("%") && !pattern.startsWith("%")
          ? `${a} STARTS WITH ${literal(inner)}`
          : `${a} CONTAINS ${literal(inner)}`
      }
      default:
        return fail(`Unsupported filter operator "${op}" on "${path}"`)
    }
  })
  return and(parts)
}

export function toMeiliFilter(
  filters: SearchTypes.SearchFilters | undefined,
  lookup: FieldLookup = () => undefined,
  omit: Set<string> = new Set()
): string | undefined {
  if (!filters) {
    return undefined
  }
  const parts: string[] = []
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || key === "q" || omit.has(key)) {
      continue
    }
    if (key === "$and" || key === "$or") {
      const children = (value as SearchTypes.SearchFilters[])
        .map((child) => toMeiliFilter(child, lookup, omit))
        .filter((c): c is string => !!c)
      if (children.length) {
        parts.push(key === "$and" ? and(children) : or(children))
      }
      continue
    }
    if (key === "$not") {
      const child = toMeiliFilter(value as SearchTypes.SearchFilters, lookup, omit)
      if (child) {
        parts.push(`NOT (${child})`)
      }
      continue
    }
    if (key.startsWith("$")) {
      fail(`Unsupported logical operator "${key}"`)
    }
    parts.push(fieldExpression(key, value, lookup(key)))
  }
  return parts.length ? and(parts) : undefined
}

// Top-level fields a filter constrains, for disjunctive facet counts.
export const filteredFields = (filters?: SearchTypes.SearchFilters) =>
  new Set(Object.keys(filters ?? {}).filter((k) => !k.startsWith("$") && k !== "q"))
