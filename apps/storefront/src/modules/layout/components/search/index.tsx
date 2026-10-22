"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { SearchClient } from "instantsearch.js"
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch"

import useSearchSettled from "@lib/hooks/use-search-settled"
import useToggleState from "@lib/hooks/use-toggle-state"
import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"
import { Text } from "@modules/common/components/ui"
import Icon from "@modules/laly/components/icon"
import { useT } from "@i18n/client"
import SearchDrawer from "./drawer"
import SearchHit, { ProductHit } from "./hit"

const HITS_PER_PAGE = 12
const DEBOUNCE_MS = 250

const SearchPanel = ({ onNavigate }: { onNavigate: () => void }) => {
  const t = useT()
  const timer = useRef<number | undefined>(undefined)

  const queryHook = useCallback(
    (nextQuery: string, search: (value: string) => void) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => search(nextQuery), DEBOUNCE_MS)
    },
    []
  )

  const { query, refine } = useSearchBox({ queryHook })
  const { items } = useHits<ProductHit>()
  const { status, error } = useInstantSearch()
  const { isSettled } = useSearchSettled()

  const [inputValue, setInputValue] = useState(query)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const hasInput = Boolean(inputValue.trim())
  const isPending = inputValue.trim() !== query.trim()
  const hasResults = Boolean(query.trim()) && items.length > 0

  return (
    <>
      <div className="flex items-center gap-x-3 border-b border-ui-border-base px-4">
        <Icon name="search" size={20} className="shrink-0 text-laly-faint" />
        <input
          type="search"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value)
            refine(event.target.value)
          }}
          placeholder={t("layout.search_placeholder")}
          aria-label={t("layout.search_products")}
          autoFocus
          className="txt-medium w-full bg-transparent py-4 text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
          data-testid="search-input"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasInput ? (
          <Text
            className="px-4 py-6 text-center text-ui-fg-muted"
            data-testid="search-empty"
          >
            {t("layout.search_hint")}
          </Text>
        ) : status === "error" ? (
          <Text
            className="px-4 py-6 text-center text-ui-fg-error"
            data-testid="search-error"
          >
            {t("layout.search_failed")}
            {error?.message ? `: ${error.message}` : "."}
          </Text>
        ) : !isSettled ? (
          <Text
            className="px-4 py-6 text-center text-ui-fg-muted"
            data-testid="search-loading"
          >
            {t("layout.searching")}
          </Text>
        ) : hasResults ? (
          <ul className="py-2" data-testid="search-results">
            {items.map((hit) => (
              <SearchHit key={hit.objectID} hit={hit} onNavigate={onNavigate} />
            ))}
          </ul>
        ) : isPending || !query.trim() ? (
          <Text
            className="px-4 py-6 text-center text-ui-fg-muted"
            data-testid="search-loading"
          >
            {t("layout.searching")}
          </Text>
        ) : (
          <Text
            className="px-4 py-6 text-center text-ui-fg-subtle"
            data-testid="search-no-results"
          >
            {t("layout.no_results_for", { query })}
          </Text>
        )}
      </div>
    </>
  )
}

const Search = ({ variant = "icon" }: { variant?: "icon" | "bar" }) => {
  const t = useT()
  const { state: isOpen, open, close } = useToggleState()

  return (
    <>
      {variant === "bar" ? (
        <button
          type="button"
          onClick={open}
          aria-label={t("layout.search_products")}
          className="relative w-full max-w-[440px] h-11 rounded-full border border-laly-line bg-laly-bg ps-5 pe-12 text-start text-[13.5px] text-laly-faint hover:border-laly-teal transition-colors"
          data-testid="nav-search-button"
        >
          {t("layout.search_placeholder")}
          <span className="absolute end-1 top-1 w-9 h-9 rounded-full bg-laly-teal text-white flex items-center justify-center">
            <Icon name="search" size={18} />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={open}
          aria-label={t("layout.search_products")}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-laly-teal-soft hover:text-laly-teal"
          data-testid="nav-search-button"
        >
          <Icon name="search" size={21} />
        </button>
      )}

      <SearchDrawer isOpen={isOpen} close={close}>
        <InstantSearch
          indexName={PRODUCT_INDEX_NAME}
          searchClient={searchClient as unknown as SearchClient}
          future={{ preserveSharedStateOnUnmount: true }}
        >
          <Configure hitsPerPage={HITS_PER_PAGE} />
          <SearchPanel onNavigate={close} />
        </InstantSearch>
      </SearchDrawer>
    </>
  )
}

export default Search
