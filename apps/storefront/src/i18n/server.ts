import "server-only"

import { headers } from "next/headers"

import { DEFAULT_LOCALE, isLocale, Locale, LOCALE_HEADER, LOCALES, localePath, PATH_HEADER } from "./config"
import { MESSAGES } from "./messages"
import { chainFor, makeT, Messages } from "./translate"

/** The visitor's language, as the middleware read it from the address. */
export async function getLocale(): Promise<Locale> {
  try {
    const value = (await headers()).get(LOCALE_HEADER)
    return isLocale(value) ? value : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

/** Only the dictionaries a page in this language can need (sent to the browser too). */
export const dictionariesFor = (locale: Locale): Messages[] => chainFor(locale).map((l) => MESSAGES[l])

export async function getT() {
  return makeT(dictionariesFor(await getLocale()))
}

/** "/kw/en/..." for a path, in the visitor's language (server actions and redirects). */
export async function localizedPath(countryCode: string, path = "") {
  return localePath(countryCode, await getLocale(), path)
}

/** The visitor's language from the cookie, for API routes outside the pages. */
export function localeFromCookie(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/**
 * hreflang links and the canonical address of the current page in every
 * language, from the path the middleware passed on.
 */
export async function languageAlternates(countryCode = process.env.NEXT_PUBLIC_DEFAULT_REGION || "kw") {
  const h = await headers().catch(() => null)
  const path = h?.get(PATH_HEADER) ?? "/"
  const locale = await getLocale()
  const languages: Record<string, string> = Object.fromEntries(
    (Object.keys(LOCALES) as Locale[]).map((l) => [l, localePath(countryCode, l, path)])
  )
  return {
    canonical: languages[locale],
    languages: { ...languages, "x-default": languages[DEFAULT_LOCALE] },
  }
}
