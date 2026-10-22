"use client"

import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { SearchClient } from "instantsearch.js"
import type { Hit } from "instantsearch.js"
import { Configure, InstantSearch, useHits, useInstantSearch, useRefinementList, useSearchBox } from "react-instantsearch"

import useSearchSettled from "@lib/hooks/use-search-settled"
import useToggleState from "@lib/hooks/use-toggle-state"
import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"
import { localePath } from "@i18n/config"
import { useLocale, useT } from "@i18n/client"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon, { type IconName } from "@modules/laly/components/icon"
import HitPrice from "@modules/store/components/store-hits/price"
import { matches } from "./match"
import SearchModal from "./modal"

export type SearchCategory = {
  handle: string
  /** In the page's language. */
  name: string
  /** The stored (Arabic) name, as the search index has it. */
  indexName: string
  icon: IconName
  topLevel: boolean
}
export type SearchBrand = { handle: string; name: string }

type ProductHit = Hit<{
  title: string | null
  title_en?: string | null
  handle: string | null
  thumbnail: string | null
  brand?: string | null
  price_on_request?: boolean
}>

const PRODUCTS = 8
const DEBOUNCE_MS = 220

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="px-4 small:px-6 py-3">
    <h3 className="mb-2.5 text-[12px] font-extrabold uppercase tracking-wide text-laly-mut">{title}</h3>
    {children}
  </section>
)

const Chip = ({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) => (
  <LocalizedClientLink
    href={href}
    onClick={onClick}
    className="inline-flex items-center gap-2 h-10 px-3.5 rounded-full border border-laly-line bg-white text-[13.5px] font-bold text-laly-ink hover:border-laly-teal hover:text-laly-teal transition-colors"
  >
    {children}
  </LocalizedClientLink>
)

function SearchPanel({
  categories,
  brands,
  close,
}: {
  categories: SearchCategory[]
  brands: SearchBrand[]
  close: () => void
}) {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const { countryCode } = useParams()
  const timer = useRef<number | undefined>(undefined)
  const queryHook = useCallback((next: string, search: (value: string) => void) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => search(next), DEBOUNCE_MS)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const { query, refine } = useSearchBox({ queryHook })
  const { items, results } = useHits<ProductHit>()
  // Facet counts for the current query (which categories and brands hold the results).
  const categoryFacets = useRefinementList({ attribute: "category", limit: 6 })
  const brandFacets = useRefinementList({ attribute: "brand", limit: 6 })
  const { status } = useInstantSearch()
  const { isSettled } = useSearchSettled()
  const [input, setInput] = useState(query)

  const q = input.trim()
  const total = results?.nbHits ?? 0
  const storeUrl = localePath(String(countryCode), locale, `/store?${new URLSearchParams({ "product[query]": q })}`)

  // Names that match what was typed, then the ones holding the most results.
  const foundCategories = useMemo(() => {
    if (!q) return []
    const byIndexName = new Map(categories.map((c) => [c.indexName, c]))
    const out = new Map<string, { c: SearchCategory; count?: number }>()
    categories.filter((c) => matches(c.name, q) || matches(c.indexName, q)).forEach((c) => out.set(c.handle, { c }))
    categoryFacets.items.forEach((f) => {
      const c = byIndexName.get(f.value)
      if (c && !out.has(c.handle)) out.set(c.handle, { c, count: f.count })
      else if (c) out.set(c.handle, { c, count: f.count })
    })
    return Array.from(out.values()).slice(0, 6)
  }, [q, categories, categoryFacets.items])

  const foundBrands = useMemo(() => {
    if (!q) return []
    const byName = new Map(brands.map((b) => [b.name.toLowerCase(), b]))
    const out = new Map<string, { b: SearchBrand; count?: number }>()
    brands.filter((b) => matches(b.name, q)).forEach((b) => out.set(b.handle, { b }))
    brandFacets.items.forEach((f) => {
      const b = byName.get(f.value.toLowerCase())
      if (b) out.set(b.handle, { b, count: f.count })
    })
    return Array.from(out.values()).slice(0, 6)
  }, [q, brands, brandFacets.items])

  const loading = q !== query.trim() || !isSettled
  const products = q ? items.filter((h) => h.handle).slice(0, PRODUCTS) : []

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (!q) return
          close()
          router.push(storeUrl)
        }}
        className="flex items-center gap-3 border-b border-laly-line px-4 small:px-6 h-16 small:h-[72px] shrink-0"
      >
        <Icon name="search" size={22} className="shrink-0 text-laly-teal" />
        <input
          type="search"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            refine(e.target.value)
          }}
          placeholder={t("layout.search_placeholder")}
          aria-label={t("layout.search_products")}
          autoFocus
          enterKeyHint="search"
          className="flex-1 min-w-0 bg-transparent text-[16px] small:text-[18px] font-bold text-laly-ink outline-none placeholder:font-normal placeholder:text-laly-faint [&::-webkit-search-cancel-button]:hidden"
          data-testid="search-input"
        />
        {input && (
          <button
            type="button"
            onClick={() => {
              setInput("")
              refine("")
            }}
            className="text-[13px] font-bold text-laly-mut hover:text-laly-ink"
          >
            {t("layout.search_clear")}
          </button>
        )}
        <button
          type="button"
          onClick={close}
          aria-label={t("layout.close_search")}
          className="w-9 h-9 rounded-full bg-laly-bg flex items-center justify-center text-laly-mut hover:text-laly-ink shrink-0"
          data-testid="close-search-drawer"
        >
          <span aria-hidden className="text-xl leading-none">×</span>
        </button>
      </form>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-4">
        {!q ? (
          <>
            <Section title={t("layout.search_categories")}>
              <div className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 gap-2">
                {categories
                  .filter((c) => c.topLevel)
                  .map((c) => (
                    <LocalizedClientLink
                      key={c.handle}
                      href={`/categories/${c.handle}`}
                      onClick={close}
                      className="flex items-center gap-2.5 rounded-[14px] border border-laly-line p-2.5 hover:border-laly-teal transition-colors"
                    >
                      <span className="w-9 h-9 rounded-[10px] bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
                        <Icon name={c.icon} size={19} />
                      </span>
                      <span className="text-[13px] font-bold leading-tight text-laly-ink">{c.name}</span>
                    </LocalizedClientLink>
                  ))}
              </div>
            </Section>
            {brands.length > 0 && (
              <Section title={t("layout.search_brands")}>
                <div className="flex flex-wrap gap-2">
                  {brands.map((b) => (
                    <Chip key={b.handle} href={`/brands/${b.handle}`} onClick={close}>
                      <span dir="ltr" className="font-latin">
                        {b.name}
                      </span>
                    </Chip>
                  ))}
                </div>
              </Section>
            )}
          </>
        ) : status === "error" ? (
          <p className="px-6 py-10 text-center text-laly-mut" data-testid="search-error">
            {t("layout.search_failed_retry")}
          </p>
        ) : (
          <>
            {foundCategories.length > 0 && (
              <Section title={t("layout.search_categories")}>
                <div className="flex flex-wrap gap-2">
                  {foundCategories.map(({ c, count }) => (
                    <Chip key={c.handle} href={`/categories/${c.handle}`} onClick={close}>
                      <Icon name={c.icon} size={16} className="text-laly-teal" />
                      {c.name}
                      {count ? <span className="text-[11.5px] font-normal text-laly-mut">{count}</span> : null}
                    </Chip>
                  ))}
                </div>
              </Section>
            )}
            {foundBrands.length > 0 && (
              <Section title={t("layout.search_brands")}>
                <div className="flex flex-wrap gap-2">
                  {foundBrands.map(({ b, count }) => (
                    <Chip key={b.handle} href={`/brands/${b.handle}`} onClick={close}>
                      <span dir="ltr" className="font-latin">
                        {b.name}
                      </span>
                      {count ? <span className="text-[11.5px] font-normal text-laly-mut">{count}</span> : null}
                    </Chip>
                  ))}
                </div>
              </Section>
            )}
            <Section title={t("layout.search_products_title")}>
              {products.length > 0 ? (
                <ul className="grid small:grid-cols-2 gap-2" data-testid="search-results">
                  {products.map((hit) => (
                    <li key={hit.objectID}>
                      <LocalizedClientLink
                        href={`/products/${hit.handle}`}
                        onClick={close}
                        className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-laly-teal-faint transition-colors"
                        data-testid="search-hit-link"
                      >
                        <span className="relative w-16 h-16 shrink-0 rounded-[12px] bg-laly-bg border border-laly-line overflow-hidden">
                          {hit.thumbnail ? (
                            <Image src={hit.thumbnail} alt="" fill sizes="64px" className="object-contain p-1.5" />
                          ) : (
                            <Icon name="grid" size={20} className="absolute inset-0 m-auto text-laly-faint" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          {hit.brand && (
                            <span dir="ltr" className="block font-latin text-[11.5px] font-bold text-laly-teal">
                              {hit.brand}
                            </span>
                          )}
                          <span className="block text-[13.5px] font-bold leading-snug text-laly-ink line-clamp-2">
                            <bdi>{(locale !== "ar" && hit.title_en) || hit.title}</bdi>
                          </span>
                          <span className="block mt-0.5 text-[13px] font-extrabold text-laly-ink">
                            {hit.price_on_request ? (
                              <span className="text-laly-teal">{t("layout.price_on_request")}</span>
                            ) : (
                              <HitPrice hit={hit as unknown as Record<string, unknown>} currencyCode="kwd" />
                            )}
                          </span>
                        </span>
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              ) : loading ? (
                <p className="py-8 text-center text-laly-mut" data-testid="search-loading">
                  {t("layout.searching")}
                </p>
              ) : (
                <p className="py-8 text-center text-laly-mut" data-testid="search-no-results">
                  {t("layout.no_results_for", { query: q })}
                </p>
              )}
            </Section>
          </>
        )}
      </div>

      {q && total > 0 && (
        <div className="shrink-0 border-t border-laly-line p-3 small:p-4">
          <LocalizedClientLink
            href={`/store?${new URLSearchParams({ "product[query]": q })}`}
            onClick={close}
            className="flex h-12 items-center justify-center gap-2 rounded-btn bg-laly-teal hover:bg-laly-teal-d text-white font-extrabold transition-colors"
          >
            {t("layout.search_view_all", { count: total })}
            <Icon name="arrowr" size={18} className="rtl:-scale-x-100" />
          </LocalizedClientLink>
        </div>
      )}
    </>
  )
}

const Search = ({
  variant = "icon",
  categories = [],
  brands = [],
}: {
  variant?: "icon" | "bar"
  categories?: SearchCategory[]
  brands?: SearchBrand[]
}) => {
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
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 small:hover:bg-laly-teal-soft small:hover:text-laly-teal"
          data-testid="nav-search-button"
        >
          <Icon name="search" size={21} />
        </button>
      )}

      <SearchModal isOpen={isOpen} close={close}>
        <InstantSearch
          indexName={PRODUCT_INDEX_NAME}
          searchClient={searchClient as unknown as SearchClient}
          future={{ preserveSharedStateOnUnmount: true }}
        >
          <Configure hitsPerPage={PRODUCTS} />
          <SearchPanel categories={categories} brands={brands} close={close} />
        </InstantSearch>
      </SearchModal>
    </>
  )
}

export default Search
