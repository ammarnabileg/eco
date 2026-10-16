import type { Lang } from "@lib/data/content"

// Picks `${field}_${lang}` from a bilingual row, falling back to Arabic.
export function localize<T extends Record<string, unknown>>(
  row: T,
  field: string,
  lang: Lang = "ar"
): string {
  const value = row[`${field}_${lang}`] ?? row[`${field}_ar`]
  return typeof value === "string" ? value : ""
}

export const whatsappLink = (number: string | null, text?: string) =>
  number
    ? `https://wa.me/${number.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`
    : null
