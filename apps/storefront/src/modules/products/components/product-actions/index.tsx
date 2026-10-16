"use client"

import { isEqual } from "lodash"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { addToCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import Icon from "@modules/laly/components/icon"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import ProductPrice from "../product-price"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  layout?: "mobile" | "desktop"
}

const optionsAsKeymap = (variantOptions: HttpTypes.StoreProductVariant["options"]) =>
  variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})

const MAX_QTY = 10

export default function ProductActions({
  product,
  disabled,
  layout = "desktop",
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const countryCode = useParams().countryCode as string

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle")

  // A single variant is preselected.
  useEffect(() => {
    if (product.variants?.length === 1) {
      setOptions(optionsAsKeymap(product.variants[0].options) ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(
    () =>
      product.variants?.find((v) => isEqual(optionsAsKeymap(v.options), options)),
    [product.variants, options]
  )

  const setOptionValue = (optionId: string, value: string) =>
    setOptions((prev) => ({ ...prev, [optionId]: value }))

  // Keep the selected variant in the URL so it can be shared.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = selectedVariant?.id ?? null
    if (params.get("v_id") === value) {
      return
    }
    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }
    router.replace(pathname + "?" + params.toString(), { scroll: false })
  }, [selectedVariant, pathname, router, searchParams])

  const available = useMemo(() => {
    if (!selectedVariant) return 0
    if (!selectedVariant.manage_inventory || selectedVariant.allow_backorder) return MAX_QTY
    return Math.min(selectedVariant.inventory_quantity ?? 0, MAX_QTY)
  }, [selectedVariant])
  const inStock = available > 0

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return
    setStatus("adding")
    try {
      await addToCart({ variantId: selectedVariant.id, quantity, countryCode })
      setStatus("added")
    } catch {
      setStatus("error")
    }
    setTimeout(() => setStatus("idle"), 2200)
  }

  const isDisabled = !inStock || !selectedVariant || !!disabled || status === "adding"
  const label = !selectedVariant
    ? "اختر المواصفات"
    : !inStock
      ? "نفدت الكمية"
      : status === "adding"
        ? "جاري الإضافة…"
        : status === "added"
          ? "تمت الإضافة للسلة"
          : status === "error"
            ? "حاول مرة أخرى"
            : "أضف للسلة"

  const addButton = (extra: string) => (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isDisabled}
      aria-live="polite"
      className={`flex items-center justify-center gap-2 rounded-btn font-bold text-[15px] transition-colors disabled:cursor-not-allowed ${
        status === "added"
          ? "bg-laly-green text-white"
          : isDisabled
            ? "bg-laly-line text-laly-faint"
            : "bg-laly-teal text-white hover:bg-laly-teal-d"
      } ${extra}`}
      data-testid="add-product-button"
    >
      <Icon name={status === "added" ? "check" : "cart"} size={19} />
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-y-5">
      <ProductPrice product={product} variant={selectedVariant} />

      {(product.variants?.length ?? 0) > 1 &&
        (product.options ?? []).map((option) => (
          <OptionSelect
            key={option.id}
            option={option}
            current={options[option.id]}
            updateOption={setOptionValue}
            title={option.title ?? ""}
            data-testid="product-options"
            disabled={!!disabled || status === "adding"}
          />
        ))}

      {selectedVariant && (
        <p className={`flex items-center gap-1.5 text-sm font-bold ${inStock ? "text-laly-green" : "text-laly-red"}`}>
          <span className={`w-2 h-2 rounded-full ${inStock ? "bg-laly-green" : "bg-laly-red"}`} />
          {inStock
            ? selectedVariant.manage_inventory && (selectedVariant.inventory_quantity ?? 0) <= 5
              ? `متوفر — باقي ${selectedVariant.inventory_quantity} فقط`
              : "متوفر في المخزون"
            : "غير متوفر حالياً"}
        </p>
      )}

      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-btn border-[1.6px] border-laly-line bg-white">
          <button
            type="button"
            aria-label="زيادة الكمية"
            className="w-10 h-12 text-xl font-bold text-laly-teal disabled:text-laly-faint"
            disabled={quantity >= available}
            onClick={() => setQuantity((q) => Math.min(q + 1, available))}
          >
            +
          </button>
          <span className="w-8 text-center font-extrabold tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="تقليل الكمية"
            className="w-10 h-12 text-xl font-bold text-laly-teal disabled:text-laly-faint"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
          >
            −
          </button>
        </div>
        {addButton("flex-1 h-12")}
      </div>

      {layout === "mobile" && (
        // Always-visible purchase bar on phones (replaces the bottom nav here).
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-laly-line px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-8px_24px_-16px_rgba(20,38,44,.4)]">
          <div className="shrink-0">
            <ProductPrice product={product} variant={selectedVariant} size="compact" />
          </div>
          {addButton("flex-1 h-12")}
        </div>
      )}
    </div>
  )
}
