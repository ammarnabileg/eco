"use client"

import { useState } from "react"

import { useT } from "@i18n/client"
import { deleteLineItem, updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemAddons from "@modules/common/components/line-item-addons"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import Thumbnail from "@modules/products/components/thumbnail"

const MAX_QTY = 10

export default function CartLine({
  item,
  currencyCode,
}: {
  item: HttpTypes.StoreCartLineItem
  currencyCode: string
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    setBusy(true)
    await action()
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusy(false))
  }

  const setQuantity = (quantity: number) =>
    run(() => updateLineItem({ lineId: item.id, quantity }))

  return (
    <li
      className={`flex gap-3 small:gap-4 bg-white border border-laly-line rounded-card p-3 small:p-4 transition-opacity ${busy ? "opacity-60" : ""}`}
      data-testid="product-row"
    >
      <LocalizedClientLink href={`/products/${item.product_handle}`} className="w-20 small:w-24 shrink-0">
        <Thumbnail thumbnail={item.thumbnail} images={item.variant?.product?.images} size="square" />
      </LocalizedClientLink>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <LocalizedClientLink
              href={`/products/${item.product_handle}`}
              className="text-sm small:text-[15px] font-bold leading-snug line-clamp-2 hover:text-laly-teal"
              data-testid="product-title"
            >
              <bdi>{item.product_title}</bdi>
            </LocalizedClientLink>
            {item.variant?.title !== "Default" && (
              <LineItemOptions variant={item.variant} data-testid="product-variant" />
            )}
            <LineItemAddons metadata={item.metadata} currencyCode={currencyCode} />
          </div>
          <button
            type="button"
            onClick={() => run(() => deleteLineItem(item.id))}
            disabled={busy}
            aria-label={t("cart.remove_item_aria", { title: item.product_title ?? "" })}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-laly-faint hover:text-laly-red hover:bg-red-50"
            data-testid="product-delete-button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="flex items-center rounded-btn border border-laly-line" data-testid="product-select-button">
            <button
              type="button"
              aria-label={t("cart.increase_quantity")}
              disabled={busy || item.quantity >= MAX_QTY}
              onClick={() => setQuantity(item.quantity + 1)}
              className="w-8 h-9 font-bold text-laly-teal disabled:text-laly-faint"
            >
              +
            </button>
            <span className="w-7 text-center text-sm font-extrabold tabular-nums" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={t("cart.decrease_quantity")}
              disabled={busy || item.quantity <= 1}
              onClick={() => setQuantity(item.quantity - 1)}
              className="w-8 h-9 font-bold text-laly-teal disabled:text-laly-faint"
            >
              −
            </button>
          </div>
          <div className="text-end">
            {item.quantity > 1 && (
              <div className="text-xs text-laly-mut flex items-center gap-1 justify-end">
                <LineItemUnitPrice item={item} style="tight" currencyCode={currencyCode} />
                <span>{t("cart.per_item")}</span>
              </div>
            )}
            <div className="font-extrabold">
              <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
            </div>
          </div>
        </div>
        {error && (
          <p className="text-xs text-laly-red flex items-center gap-1" data-testid="product-error-message">
            <Icon name="bolt" size={12} />
            {error}
          </p>
        )}
      </div>
    </li>
  )
}
