"use client"

import { useCallback, useEffect, useState } from "react"

// Lists of product ids kept in the browser (no account needed). Reads only
// after mount so the server HTML and the first client render match.

export const WISHLIST_KEY = "laly_wishlist"
export const COMPARE_KEY = "laly_compare"
export const LIMITS: Record<string, number> = { [WISHLIST_KEY]: 100, [COMPARE_KEY]: 4 }
const EVENT = "laly-saved-ids"

export function readIds(key: string): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) ?? "[]")
    return Array.isArray(raw)
      ? Array.from(new Set(raw.filter((x): x is string => typeof x === "string"))).slice(0, LIMITS[key] ?? 100)
      : []
  } catch {
    return []
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Storage full or blocked (private mode): the list lives for this page only.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, ids } }))
}

export function useSavedIds(key: string) {
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const max = LIMITS[key] ?? 100

  useEffect(() => {
    setIds(readIds(key))
    setReady(true)
    const onLocal = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; ids: string[] }>).detail
      if (d?.key === key) setIds(d.ids)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) setIds(readIds(key))
    }
    window.addEventListener(EVENT, onLocal)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(EVENT, onLocal)
      window.removeEventListener("storage", onStorage)
    }
  }, [key])

  const has = useCallback((id: string) => ids.includes(id), [ids])

  /** Adds or removes; returns false when the list is full and nothing was added. */
  const toggle = useCallback(
    (id: string) => {
      const current = readIds(key)
      if (current.includes(id)) {
        writeIds(key, current.filter((x) => x !== id))
        return true
      }
      if (current.length >= max) return false
      writeIds(key, [...current, id])
      return true
    },
    [key, max]
  )

  const remove = useCallback((id: string) => writeIds(key, readIds(key).filter((x) => x !== id)), [key])
  const clear = useCallback(() => writeIds(key, []), [key])

  return { ids, ready, has, toggle, remove, clear, max }
}
