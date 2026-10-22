"use client"

import { createContext, ReactNode, useContext, useMemo } from "react"

import { DEFAULT_LOCALE, Locale } from "./config"
import { makeT, Messages, Translate } from "./translate"

const I18nContext = createContext<{ locale: Locale; dictionaries: Messages[] }>({ locale: DEFAULT_LOCALE, dictionaries: [] })

/** Set once in the root layout with the dictionaries from `dictionariesFor`. */
export function I18nProvider({ locale, dictionaries, children }: { locale: Locale; dictionaries: Messages[]; children: ReactNode }) {
  const value = useMemo(() => ({ locale, dictionaries }), [locale, dictionaries])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useLocale = () => useContext(I18nContext).locale

export function useT(): Translate {
  const { dictionaries } = useContext(I18nContext)
  return useMemo(() => makeT(dictionaries), [dictionaries])
}
