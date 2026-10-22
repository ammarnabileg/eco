import { DEFAULT_LOCALE, isLocale, Locale, LOCALES } from "@i18n/config"
import { currentLocale } from "@i18n/locale-action"

// The backend translates catalogue fields (when its translation feature is
// on) into the language of the page. In the browser the page's <html lang>
// tells it without a round trip; on the server the middleware's header does.
export async function getLocaleHeader() {
  let locale: Locale = DEFAULT_LOCALE
  if (typeof window !== "undefined") {
    const lang = document.documentElement.lang
    if (isLocale(lang)) locale = lang
  } else {
    locale = await currentLocale()
  }
  return {
    "x-medusa-locale": LOCALES[locale].medusa,
  } as const
}
