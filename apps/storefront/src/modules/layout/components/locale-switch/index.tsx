"use client"

import { usePathname, useSearchParams } from "next/navigation"

import { useLocale } from "@i18n/client"
import { Locale, LOCALES, switchLocalePath } from "@i18n/config"

/**
 * Links to the same page in the other languages. A full page load, because
 * the direction of the whole page (RTL/LTR) changes with the language.
 */
export default function LocaleSwitch({ variant = "pill" }: { variant?: "pill" | "text" | "segmented" }) {
  const locale = useLocale()
  const pathname = usePathname()
  const search = useSearchParams()?.toString()
  const others = (Object.keys(LOCALES) as Locale[]).filter((l) => l !== locale)
  const href = (l: Locale) => `${switchLocalePath(pathname, l)}${search ? `?${search}` : ""}`

  if (variant === "segmented") {
    return (
      <div className="inline-flex rounded-full bg-laly-bg p-1" role="group" aria-label="Language / اللغة">
        {(Object.keys(LOCALES) as Locale[]).map((l) => (
          <a
            key={l}
            href={href(l)}
            hrefLang={l}
            lang={l}
            aria-current={l === locale ? "true" : undefined}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold ${l === locale ? "bg-white text-laly-teal shadow-sm" : "text-laly-mut"}`}
          >
            {LOCALES[l].label}
          </a>
        ))}
      </div>
    )
  }

  return (
    <>
      {others.map((l) => (
        <a
          key={l}
          href={href(l)}
          hrefLang={l}
          lang={l}
          className={
            variant === "pill"
              ? "h-8 min-w-[42px] px-3 rounded-full border border-white/35 text-[12px] font-bold flex items-center justify-center hover:bg-white/10"
              : "font-bold hover:text-white"
          }
        >
          {variant === "pill" ? LOCALES[l].short : LOCALES[l].label}
        </a>
      ))}
    </>
  )
}
