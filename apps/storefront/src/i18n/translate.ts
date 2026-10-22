import { FALLBACK_CHAIN, Locale } from "./config"

export type Messages = Record<string, Record<string, string>>
export type Vars = Record<string, string | number>
export type Translate = (key: string, vars?: Vars) => string

/** The languages to look in, in order: the visitor's, then English, then Arabic. */
export const chainFor = (locale: Locale): Locale[] => [locale, ...FALLBACK_CHAIN.filter((l) => l !== locale)]

/**
 * Text for a key like "cart.title", with {name} placeholders filled in. A key
 * missing in the visitor's language falls back along the chain, then shows
 * the key itself so the gap is visible.
 */
export function makeT(dictionaries: Messages[]): Translate {
  return (key, vars) => {
    const dot = key.indexOf(".")
    const ns = key.slice(0, dot)
    const name = key.slice(dot + 1)
    let text = key
    for (const d of dictionaries) {
      const hit = d[ns]?.[name]
      if (hit !== undefined) {
        text = hit
        break
      }
    }
    return vars ? text.replace(/\{(\w+)\}/g, (m, v) => (v in vars ? String(vars[v]) : m)) : text
  }
}
