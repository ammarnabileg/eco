// The store's languages. Arabic is the default and has no URL prefix
// (/kw/products/...); every other language adds its code after the country
// (/kw/en/products/...).
//
// Adding a language: add it here, add a messages folder with the same
// namespaces (missing keys fall back to English, then Arabic), and translate
// the catalogue in the admin.
export const LOCALES = {
  ar: { label: "العربية", short: "ع", dir: "rtl", medusa: "ar", intl: "ar-KW-u-nu-latn" },
  en: { label: "English", short: "EN", dir: "ltr", medusa: "en", intl: "en-KW" },
} as const

export type Locale = keyof typeof LOCALES
export const DEFAULT_LOCALE: Locale = "ar"
export const FALLBACK_CHAIN: Locale[] = ["en", "ar"]
/** Request header the middleware sets with the visitor's language. */
export const LOCALE_HEADER = "x-laly-locale"
/** Request header with the page's path without country and language ("/products/x"). */
export const PATH_HEADER = "x-laly-path"
/** The last language the visitor browsed in (for API routes without one in the address). */
export const LOCALE_COOKIE = "_laly_locale"

export const isLocale = (value: unknown): value is Locale => typeof value === "string" && value in LOCALES

/** "/kw" + "/en" (unless Arabic) + path. */
export const localePath = (countryCode: string, locale: Locale, path = "") =>
  `/${countryCode}${locale === DEFAULT_LOCALE ? "" : `/${locale}`}${path === "/" ? "" : path}`

/** The same page in another language, from the address in the browser. */
export function switchLocalePath(pathname: string, target: Locale) {
  const [, country = "", maybeLocale, ...rest] = pathname.split("/")
  const tail = isLocale(maybeLocale) ? rest : [maybeLocale, ...rest].filter((s) => s !== undefined)
  const path = tail.length && tail.join("/") ? `/${tail.join("/")}` : ""
  return localePath(country, target, path)
}

/** Locale for Intl number and date formatting (Latin digits in Arabic, as the store uses). */
export const intlLocale = (locale: Locale) => LOCALES[locale].intl
