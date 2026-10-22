"use client"

import Image from "next/image"
import { useParams } from "next/navigation"
import { Fragment, useEffect, useState } from "react"

import { useT } from "@i18n/client"
import { CompareRow, getCompareData, ToolProduct } from "@lib/data/tools"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import AddToCartButton from "@modules/laly/components/add-to-cart-button"
import { CompareIcon } from "@modules/tools/components/compare-button"
import { COMPARE_KEY, useSavedIds } from "@modules/tools/lib/saved-ids"

const norm = (v: string | null) => (v ?? "").trim().toLowerCase().replace(/\s+/g, " ")
const differs = (values: (string | null)[]) => new Set(values.map(norm)).size > 1

export default function CompareView() {
  const t = useT()
  const { countryCode } = useParams() as { countryCode: string }
  const { ids, ready, remove } = useSavedIds(COMPARE_KEY)
  const [data, setData] = useState<{ products: ToolProduct[]; rows: CompareRow[] } | null>(null)
  const [onlyDiff, setOnlyDiff] = useState(false)
  const key = ids.join(",")

  useEffect(() => {
    if (!ready) return
    if (!ids.length) {
      setData({ products: [], rows: [] })
      return
    }
    let live = true
    getCompareData(ids, countryCode)
      .then((d) => live && setData(d))
      .catch(() => live && setData({ products: [], rows: [] }))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, countryCode])

  if (!ready || data === null) {
    return <p className="py-16 text-center text-laly-mut" aria-busy="true">{t("tools.loading")}</p>
  }

  // Removing a product hides its column right away, before the reload.
  const cols = data.products.map((p, i) => ({ p, i })).filter(({ p }) => ids.includes(p.id))

  if (cols.length < 2) {
    return (
      <div className="py-16 flex flex-col items-center text-center gap-3">
        <span className="w-16 h-16 rounded-full bg-laly-teal-soft text-laly-teal flex items-center justify-center">
          <CompareIcon size={28} />
        </span>
        <h2 className="text-lg font-extrabold">{t("tools.compare_empty_title")}</h2>
        <p className="max-w-sm text-[14px] text-laly-mut">{t("tools.compare_empty_text")}</p>
        {cols.length === 1 && (
          <p className="text-[13.5px]">
            {t("tools.compare_selected_one")} <bdi className="font-bold">{cols[0].p.title}</bdi>
          </p>
        )}
        <LocalizedClientLink href="/store" className="mt-2 h-11 px-5 rounded-btn inline-flex items-center bg-laly-teal text-white text-sm font-bold hover:bg-laly-teal-d">
          {t("tools.browse_products")}
        </LocalizedClientLink>
      </div>
    )
  }

  const categories = new Set(cols.map(({ p }) => p.categoryId ?? ""))
  const mixed = categories.size > 1
  const rows = data.rows
    .map((r) => ({ ...r, values: cols.map(({ i }) => r.values[i]) }))
    .map((r) => ({ ...r, diff: differs(r.values) }))
  const visible = onlyDiff ? rows.filter((r) => r.diff) : rows
  const cell = "p-3 align-top border-b border-laly-line text-[13px] text-start"
  const head = `${cell} sticky start-0 z-10 bg-white font-bold text-laly-mut w-[120px] min-w-[120px] small:w-[200px] small:min-w-[200px]`
  let lastGroup: string | null | undefined

  return (
    <>
      {mixed && (
        <p role="status" className="mb-4 rounded-btn bg-laly-sand-soft text-laly-ink border border-laly-sand px-4 py-3 text-[13.5px]">
          {t("tools.compare_mixed_categories")}
        </p>
      )}
      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13.5px] text-laly-mut">{t("tools.compare_count", { count: cols.length, max: 4 })}</p>
        <label className="inline-flex items-center gap-2 text-[13.5px] font-bold cursor-pointer">
          <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="w-4 h-4 accent-laly-teal" />
          {t("tools.differences_only")}
        </label>
      </div>
      <div className="overflow-x-auto -mx-3.5 small:mx-0 bg-white small:border small:border-laly-line small:rounded-card">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: 120 + cols.length * 160 }}>
          <caption className="sr-only">{t("tools.compare_title")}</caption>
          <thead>
            <tr>
              <td className={head} />
              {cols.map(({ p }) => (
                <th key={p.id} scope="col" className={`${cell} font-normal min-w-[160px]`}>
                  <div className="flex flex-col gap-2">
                    <LocalizedClientLink href={`/products/${p.handle}`} className="relative block aspect-square max-w-[140px] w-full rounded-[12px] bg-laly-bg overflow-hidden">
                      {p.thumbnail ? (
                        <Image src={p.thumbnail} alt="" fill sizes="160px" className="object-contain p-2" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center"><PlaceholderImage size={20} /></span>
                      )}
                    </LocalizedClientLink>
                    <LocalizedClientLink href={`/products/${p.handle}`} className="font-bold leading-snug line-clamp-3 hover:text-laly-teal">
                      <bdi>{p.title}</bdi>
                    </LocalizedClientLink>
                    <button type="button" onClick={() => remove(p.id)} className="self-start text-[12px] font-bold text-laly-mut hover:text-laly-red">
                      {t("tools.remove")}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className={head}>{t("tools.brand")}</th>
              {cols.map(({ p }) => (
                <td key={p.id} className={cell}>{p.brand ? <bdi>{p.brand}</bdi> : "—"}</td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={head}>{t("tools.category")}</th>
              {cols.map(({ p }) => (
                <td key={p.id} className={`${cell} ${mixed ? "bg-laly-sand-soft" : ""}`}>{p.categoryName ?? "—"}</td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={head}>{t("tools.price")}</th>
              {cols.map(({ p }) => (
                <td key={p.id} className={cell}>
                  {p.onRequest ? (
                    <span className="font-bold text-laly-teal">{t("layout.price_on_request")}</span>
                  ) : p.price ? (
                    <span className="font-extrabold text-[14px]">{p.price}</span>
                  ) : (
                    "—"
                  )}
                  <div className="mt-2">
                    {!p.onRequest && p.variantId ? (
                      <AddToCartButton variantId={p.variantId} disabled={!p.inStock} />
                    ) : (
                      <LocalizedClientLink href={`/products/${p.handle}`} className="w-full h-10 rounded-btn flex items-center justify-center text-[13px] font-bold bg-laly-teal-soft text-laly-teal hover:bg-laly-teal hover:text-white">
                        {p.onRequest ? t("layout.request_quote") : t("layout.choose_options")}
                      </LocalizedClientLink>
                    )}
                  </div>
                </td>
              ))}
            </tr>
            {visible.map((r) => {
              const showGroup = r.group !== lastGroup && !!r.group
              lastGroup = r.group
              return (
                <Fragment key={r.key}>
                  {showGroup && (
                    <tr>
                      <th scope="colgroup" colSpan={cols.length + 1} className="px-3 pt-5 pb-2 text-start text-[12px] font-extrabold uppercase tracking-wide text-laly-teal bg-laly-teal-faint border-b border-laly-line">
                        {r.group}
                      </th>
                    </tr>
                  )}
                  <tr className={r.diff ? "bg-laly-sand-soft/60" : ""}>
                    <th scope="row" className={`${head} ${r.diff ? "!bg-laly-sand-soft" : ""}`}>{r.label}</th>
                    {r.values.map((v, i) => (
                      <td key={cols[i].p.id} className={cell}>{v ?? <span className="text-laly-faint">—</span>}</td>
                    ))}
                  </tr>
                </Fragment>
              )
            })}
            {!visible.length && (
              <tr>
                <td colSpan={cols.length + 1} className="p-6 text-center text-[13.5px] text-laly-mut">
                  {data.rows.length ? t("tools.no_differences") : t("tools.no_specs")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] text-laly-mut flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-sm bg-laly-sand-soft border border-laly-sand" aria-hidden />
        {t("tools.differs_legend")}
      </p>
    </>
  )
}
