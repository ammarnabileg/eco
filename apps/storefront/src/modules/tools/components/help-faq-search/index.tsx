"use client"

import { useMemo, useState } from "react"

import { useT } from "@i18n/client"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

export type HelpFaq = { q: string; a: string; group: string | null }

// Arabic-friendly matching: no diacritics, one form of alef/yeh/teh marbuta.
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")

/** Searches the published FAQ questions and answers on the page itself. */
export default function HelpFaqSearch({ items }: { items: HelpFaq[] }) {
  const t = useT()
  const [query, setQuery] = useState("")
  const words = fold(query).split(/\s+/).filter(Boolean)
  const results = useMemo(
    () => (words.length ? items.filter((f) => words.every((w) => fold(`${f.q} ${f.a}`).includes(w))) : items.slice(0, 6)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, items]
  )

  return (
    <section aria-labelledby="help-faq" className="mt-8 small:mt-12">
      <h2 id="help-faq" className="text-lg small:text-xl font-extrabold">{t("tools.help_faq_title")}</h2>
      <div className="mt-3 relative max-w-xl">
        <Icon name="search" size={18} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-laly-mut pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("tools.help_search_placeholder")}
          aria-label={t("tools.help_search_placeholder")}
          className="w-full h-12 ps-11 pe-4 rounded-btn border border-laly-line bg-white text-[14.5px] focus:outline-none focus:border-laly-teal"
        />
      </div>
      <p className="sr-only" aria-live="polite">{words.length ? t("tools.help_results", { count: results.length }) : ""}</p>
      {results.length ? (
        <ul className="mt-4 flex flex-col gap-2">
          {results.map((f, i) => (
            <li key={`${f.q}-${i}`}>
              <details className="group bg-white border border-laly-line rounded-btn">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] font-bold">
                  {f.q}
                  <Icon name="chevr" size={16} className="shrink-0 rotate-90 group-open:-rotate-90 transition-transform" />
                </summary>
                <p className="px-4 pb-4 text-[14px] leading-7 text-laly-mut whitespace-pre-line">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[14px] text-laly-mut">{t("tools.help_no_results")}</p>
      )}
      <LocalizedClientLink href="/faq" className="mt-4 inline-flex items-center gap-1 text-[13.5px] font-bold text-laly-teal">
        {t("tools.help_all_faq")}
        <Icon name="arrowr" size={14} className="rtl:-scale-x-100" />
      </LocalizedClientLink>
    </section>
  )
}
