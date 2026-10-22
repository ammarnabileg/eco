import { FALLBACK_CHAIN, Locale } from "@i18n/config"

type NamedCategory = { name: string; description?: string | null; metadata?: Record<string, unknown> | null }

// Category names are Arabic in Medusa; other languages are kept in the
// category's metadata as `name_<lang>` / `description_<lang>` (some older
// rows use `en_name`).
function fromMetadata(c: NamedCategory, field: "name" | "description", locale: Locale) {
  if (locale === "ar") return null
  for (const l of [locale, ...FALLBACK_CHAIN.filter((x) => x !== "ar")]) {
    const v = c.metadata?.[`${field}_${l}`] ?? c.metadata?.[`${l}_${field}`]
    if (typeof v === "string" && v.trim()) return v
  }
  return null
}

export const categoryName = (c: NamedCategory, locale: Locale) => fromMetadata(c, "name", locale) ?? c.name

export const categoryDescription = (c: NamedCategory, locale: Locale) =>
  fromMetadata(c, "description", locale) ?? c.description ?? null
