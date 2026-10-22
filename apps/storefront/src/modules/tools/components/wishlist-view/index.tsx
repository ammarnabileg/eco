"use client"

import Image from "next/image"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { useT } from "@i18n/client"
import { getToolProducts, ToolProduct } from "@lib/data/tools"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import AddToCartButton from "@modules/laly/components/add-to-cart-button"
import { HeartIcon } from "@modules/tools/components/wishlist-button"
import { WISHLIST_KEY, useSavedIds } from "@modules/tools/lib/saved-ids"

export default function WishlistView() {
  const t = useT()
  const { countryCode } = useParams() as { countryCode: string }
  const { ids, ready, remove, clear } = useSavedIds(WISHLIST_KEY)
  const [items, setItems] = useState<ToolProduct[] | null>(null)
  const key = ids.join(",")

  useEffect(() => {
    if (!ready) return
    if (!ids.length) {
      setItems([])
      return
    }
    let live = true
    getToolProducts(ids, countryCode)
      .then((p) => live && setItems(p))
      .catch(() => live && setItems([]))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, countryCode])

  if (!ready || items === null) {
    return <p className="py-16 text-center text-laly-mut" aria-busy="true">{t("tools.loading")}</p>
  }

  // Only products that still exist; removed ones from the backend are skipped.
  const shown = items.filter((p) => ids.includes(p.id))

  if (!shown.length) {
    return (
      <div className="py-16 flex flex-col items-center text-center gap-3">
        <span className="w-16 h-16 rounded-full bg-laly-teal-soft text-laly-teal flex items-center justify-center">
          <HeartIcon size={28} />
        </span>
        <h2 className="text-lg font-extrabold">{t("tools.wishlist_empty_title")}</h2>
        <p className="max-w-sm text-[14px] text-laly-mut">{t("tools.wishlist_empty_text")}</p>
        <LocalizedClientLink href="/store" className="mt-2 h-11 px-5 rounded-btn inline-flex items-center bg-laly-teal text-white text-sm font-bold hover:bg-laly-teal-d">
          {t("tools.browse_products")}
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[13.5px] text-laly-mut">{t("tools.wishlist_count", { count: shown.length })}</p>
        <button type="button" onClick={clear} className="text-[13px] font-bold text-laly-mut hover:text-laly-red">
          {t("tools.clear_all")}
        </button>
      </div>
      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-3 small:gap-4">
        {shown.map((p) => {
          const href = `/products/${p.handle}`
          return (
            <li key={p.id}>
              <article className="h-full flex flex-col bg-white border border-laly-line rounded-card p-3 small:p-3.5">
                <div className="relative">
                  <LocalizedClientLink href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] rounded-[13px] bg-laly-bg overflow-hidden">
                    {p.thumbnail ? (
                      <Image src={p.thumbnail} alt="" fill sizes="(max-width: 1024px) 50vw, 280px" className="object-contain p-3" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center"><PlaceholderImage size={24} /></span>
                    )}
                  </LocalizedClientLink>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={t("tools.remove_item", { name: p.title })}
                    className="absolute top-2 end-2 w-8 h-8 rounded-full bg-white border border-laly-line text-laly-red flex items-center justify-center hover:bg-laly-red hover:text-white"
                  >
                    <HeartIcon filled size={16} />
                  </button>
                </div>
                <div className="flex flex-col flex-1 pt-3">
                  {p.brand && <span dir="ltr" className="text-[11.5px] font-bold text-laly-mut text-start">{p.brand}</span>}
                  <h3 className="mt-0.5 text-[13.5px] small:text-sm font-bold leading-snug line-clamp-2 min-h-[2.6em]">
                    <LocalizedClientLink href={href} className="hover:text-laly-teal"><bdi>{p.title}</bdi></LocalizedClientLink>
                  </h3>
                  {p.onRequest ? (
                    <p className="mt-2 text-sm font-extrabold text-laly-teal">{t("layout.price_on_request")}</p>
                  ) : (
                    p.price && (
                      <div className="mt-2 flex items-baseline flex-wrap gap-x-2">
                        <span className="text-base font-extrabold">{p.price}</span>
                        {p.onSale && <span className="text-xs text-laly-faint line-through">{p.originalPrice}</span>}
                      </div>
                    )
                  )}
                  <div className="mt-auto pt-3 flex flex-col gap-2">
                    {!p.onRequest && p.variantId ? (
                      <AddToCartButton variantId={p.variantId} disabled={!p.inStock} />
                    ) : (
                      <LocalizedClientLink href={href} className="w-full h-10 rounded-btn flex items-center justify-center text-[13px] font-bold bg-laly-teal-soft text-laly-teal hover:bg-laly-teal hover:text-white">
                        {p.onRequest ? t("layout.request_quote") : t("layout.choose_options")}
                      </LocalizedClientLink>
                    )}
                    <button type="button" onClick={() => remove(p.id)} className="h-8 text-[12.5px] font-bold text-laly-mut hover:text-laly-red">
                      {t("tools.remove")}
                    </button>
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </>
  )
}
