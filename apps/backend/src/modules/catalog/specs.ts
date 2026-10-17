// Spec templates describe the fields a kind of product has; products store the
// values as a flat { key: value } map. These helpers are pure so the admin
// API, the importer, the search index and the tests share one definition.

export type SpecOption = { value: string; label_ar: string; label_en: string }

export type SpecAttribute = {
  /** Stable machine key, e.g. "resolution_mp". Never rename once used. */
  key: string
  label_ar: string
  label_en: string
  type: "text" | "number" | "boolean" | "select" | "multiselect"
  unit?: string | null
  options?: SpecOption[]
  group_ar?: string | null
  group_en?: string | null
  /** Shown as a storefront filter and indexed as a search facet. */
  filterable?: boolean
  required?: boolean
}

/** Free text may be language neutral ("IP67") or translated. */
export type LocalizedText = { ar: string; en: string }
export type SpecValue = string | number | boolean | string[] | LocalizedText
export type SpecValues = Record<string, SpecValue>

export type FaqEntry = {
  question_ar: string
  answer_ar: string
  question_en: string
  answer_en: string
}

const KEY = /^[a-z][a-z0-9_]{1,40}$/

// Problems with a template definition itself, for the admin editor.
export function templateErrors(attributes: SpecAttribute[]): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  for (const a of attributes) {
    if (!KEY.test(a.key)) {
      errors.push(`"${a.key}": key must be lowercase letters, digits and _`)
    }
    if (seen.has(a.key)) {
      errors.push(`"${a.key}": duplicate key`)
    }
    seen.add(a.key)
    if ((a.type === "select" || a.type === "multiselect") && !a.options?.length) {
      errors.push(`"${a.key}": a ${a.type} needs options`)
    }
    const values = new Set<string>()
    for (const o of a.options ?? []) {
      if (values.has(o.value)) {
        errors.push(`"${a.key}": duplicate option "${o.value}"`)
      }
      values.add(o.value)
    }
  }
  return errors
}

// Merges the templates of all a product's categories; the first definition
// of a key wins so a specific template can't be overridden by accident.
export function mergeAttributes(templates: { attributes: SpecAttribute[] }[]): SpecAttribute[] {
  const byKey = new Map<string, SpecAttribute>()
  for (const t of templates) {
    for (const a of t.attributes ?? []) {
      if (!byKey.has(a.key)) {
        byKey.set(a.key, a)
      }
    }
  }
  return [...byKey.values()]
}

const isLocalized = (v: unknown): v is LocalizedText =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  typeof (v as LocalizedText).ar === "string" &&
  typeof (v as LocalizedText).en === "string"

/**
 * Checks values against the attributes and returns the cleaned map (empty
 * values dropped, numbers coerced) or the list of problems. Unknown keys are
 * rejected so a typo never becomes a filter nobody can find.
 */
export function validateSpecs(
  attributes: SpecAttribute[],
  values: Record<string, unknown>
): { specs: SpecValues; errors: string[] } {
  const errors: string[] = []
  const specs: SpecValues = {}
  const byKey = new Map(attributes.map((a) => [a.key, a]))

  for (const [key, raw] of Object.entries(values ?? {})) {
    const attr = byKey.get(key)
    if (!attr) {
      errors.push(`"${key}" is not a field of this product's categories`)
      continue
    }
    if (raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && !raw.length)) {
      continue
    }
    const allowed = new Set((attr.options ?? []).map((o) => o.value))
    switch (attr.type) {
      case "number": {
        const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."))
        if (!Number.isFinite(n)) {
          errors.push(`${attr.label_en}: "${raw}" is not a number`)
        } else {
          specs[key] = n
        }
        break
      }
      case "boolean":
        if (typeof raw === "boolean") {
          specs[key] = raw
        } else if (raw === "true" || raw === "false") {
          specs[key] = raw === "true"
        } else {
          errors.push(`${attr.label_en}: must be yes or no`)
        }
        break
      case "select":
        if (typeof raw !== "string" || !allowed.has(raw)) {
          errors.push(`${attr.label_en}: "${raw}" is not one of the options`)
        } else {
          specs[key] = raw
        }
        break
      case "multiselect": {
        const list = Array.isArray(raw) ? raw : [raw]
        const bad = list.filter((v) => typeof v !== "string" || !allowed.has(v))
        if (bad.length) {
          errors.push(`${attr.label_en}: ${bad.map((v) => `"${v}"`).join(", ")} not in the options`)
        } else {
          specs[key] = [...new Set(list as string[])]
        }
        break
      }
      default:
        if (typeof raw === "string") {
          specs[key] = raw.trim()
        } else if (isLocalized(raw)) {
          specs[key] = { ar: raw.ar.trim(), en: raw.en.trim() }
        } else {
          errors.push(`${attr.label_en}: must be text`)
        }
    }
  }

  for (const attr of attributes) {
    if (attr.required && specs[attr.key] === undefined) {
      errors.push(`${attr.label_en} is required`)
    }
  }
  return { specs, errors }
}

/**
 * Filterable specs as "key:value" keywords for the search index, e.g.
 * ["resolution_mp:4", "night_vision:colorvu"]. The storefront splits on the
 * first ":" and labels both sides from the template.
 */
export function specFacets(attributes: SpecAttribute[], specs: SpecValues | null | undefined): string[] {
  const out: string[] = []
  for (const attr of attributes) {
    const v = specs?.[attr.key]
    if (!attr.filterable || v === undefined || isLocalized(v)) {
      continue
    }
    const list = Array.isArray(v) ? v : [v]
    list.forEach((item) => out.push(`${attr.key}:${String(item)}`))
  }
  return out
}

/** Human-readable spec text in both languages, so "ColorVu" or "4 MP" match. */
export function specText(attributes: SpecAttribute[], specs: SpecValues | null | undefined): string {
  const parts: string[] = []
  for (const attr of attributes) {
    const v = specs?.[attr.key]
    if (v === undefined || typeof v === "boolean") {
      continue
    }
    const label = (value: string) => {
      const o = attr.options?.find((x) => x.value === value)
      return o ? `${o.label_ar} ${o.label_en}` : value
    }
    if (isLocalized(v)) {
      parts.push(`${v.ar} ${v.en}`)
    } else if (Array.isArray(v)) {
      parts.push(v.map(label).join(" "))
    } else {
      parts.push(`${label(String(v))}${attr.unit ? ` ${attr.unit}` : ""}`)
    }
  }
  return parts.join(" · ")
}

export type SpecRow = {
  key: string
  label_ar: string
  label_en: string
  value_ar: string
  value_en: string
  filterable: boolean
}
export type SpecGroup = { group_ar: string; group_en: string; rows: SpecRow[] }

const YES_NO = { ar: ["نعم", "لا"], en: ["Yes", "No"] }

/**
 * A product's specs as display rows grouped like the template, in both
 * languages. Fields without a value are skipped.
 */
export function specTable(attributes: SpecAttribute[], specs: SpecValues | null | undefined): SpecGroup[] {
  const groups = new Map<string, SpecGroup>()
  for (const attr of attributes) {
    const v = specs?.[attr.key]
    if (v === undefined || v === null) {
      continue
    }
    const option = (value: string) => attr.options?.find((o) => o.value === value)
    const unit = attr.unit ? ` ${attr.unit}` : ""
    let ar: string
    let en: string
    if (typeof v === "boolean") {
      ar = YES_NO.ar[v ? 0 : 1]
      en = YES_NO.en[v ? 0 : 1]
    } else if (isLocalized(v)) {
      ar = v.ar
      en = v.en
    } else if (Array.isArray(v)) {
      ar = v.map((x) => option(x)?.label_ar ?? x).join("، ")
      en = v.map((x) => option(x)?.label_en ?? x).join(", ")
    } else {
      const o = option(String(v))
      ar = `${o?.label_ar ?? v}${o ? "" : unit}`
      en = `${o?.label_en ?? v}${o ? "" : unit}`
    }
    const groupKey = attr.group_en ?? attr.group_ar ?? ""
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        group_ar: attr.group_ar ?? "المواصفات",
        group_en: attr.group_en ?? "Specifications",
        rows: [],
      })
    }
    groups.get(groupKey)!.rows.push({
      key: attr.key,
      label_ar: attr.label_ar,
      label_en: attr.label_en,
      value_ar: ar,
      value_en: en,
      filterable: Boolean(attr.filterable),
    })
  }
  return [...groups.values()]
}
