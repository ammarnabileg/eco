import { FALLBACK_CHAIN, Locale } from "@i18n/config"

/**
 * Picks `${field}_${lang}` from a row that stores each language in its own
 * column (title_ar, title_en...). A language without a value falls back to
 * English, then Arabic.
 */
export function localize<T extends Record<string, unknown>>(
  row: T,
  field: string,
  lang: Locale
): string {
  for (const l of [lang, ...FALLBACK_CHAIN]) {
    const value = row[`${field}_${l}`]
    if (typeof value === "string" && value.trim()) return value
  }
  return ""
}

export const whatsappLink = (number: string | null, text?: string) =>
  number
    ? `https://wa.me/${number.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`
    : null
