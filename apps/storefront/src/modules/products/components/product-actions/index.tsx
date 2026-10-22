"use client"

import { isEqual } from "lodash"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { useLocale, useT } from "@i18n/client"
import { intlLocale } from "@i18n/config"
import { addConfiguredToCart, addToCart } from "@lib/data/cart"
import { isPriceOnRequest, productAddonGroups } from "@lib/util/catalog"
import { getProductPrice } from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"
import DeemaWidget from "@modules/products/components/deema-widget"
import { HttpTypes } from "@medusajs/types"
import Icon from "@modules/laly/components/icon"
import AddonSelector, {
  AddonSelection,
  addonsTotal,
  missingRequired,
  selectedOptionIds,
} from "@modules/products/components/addon-selector"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import QuoteRequest from "@modules/products/components/quote-request"
import { productText } from "@modules/products/lib/product-text"
import ProductPrice from "../product-price"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  layout?: "mobile" | "desktop"
  whatsapp?: string | null
  /** The region offers Taly instalments. */
  talyAvailable?: boolean
  /** The product is eligible for Deema and the region offers it. */
  deemaAvailable?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) =>
  variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})

const MAX_QTY = 10

export default function ProductActions({
  product,
  region,
  disabled,
  layout = "desktop",
  whatsapp,
  talyAvailable = false,
  deemaAvailable = false,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const countryCode = useParams().countryCode as string
  const t = useT()
  const lang = useLocale()
  const locale = intlLocale(lang)

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">(
    "idle"
  )
  const [addons, setAddons] = useState<AddonSelection>({})
  const addonGroups = useMemo(() => productAddonGroups(product), [product])

  // A single variant is preselected.
  useEffect(() => {
    if (product.variants?.length === 1) {
      setOptions(optionsAsKeymap(product.variants[0].options) ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(
    () =>
      product.variants?.find((v) =>
        isEqual(optionsAsKeymap(v.options), options)
      ),
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
    if (!selectedVariant.manage_inventory || selectedVariant.allow_backorder)
      return MAX_QTY
    return Math.min(selectedVariant.inventory_quantity ?? 0, MAX_QTY)
  }, [selectedVariant])
  const inStock = available > 0

  const addonIds = selectedOptionIds(addons)
  const extra = addonsTotal(addonGroups, addons)
  const needsChoice = missingRequired(addonGroups, addons).length > 0
  const { variantPrice } = getProductPrice({
    product,
    variantId: selectedVariant?.id,
    locale,
  })
  const currencyCode = variantPrice?.currency_code ?? region.currency_code

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return
    setStatus("adding")
    try {
      if (addonIds.length) {
        await addConfiguredToCart({
          variantId: selectedVariant.id,
          quantity,
          addonOptionIds: addonIds,
          countryCode,
        })
      } else {
        await addToCart({
          variantId: selectedVariant.id,
          quantity,
          countryCode,
        })
      }
      setStatus("added")
    } catch {
      setStatus("error")
    }
    setTimeout(() => setStatus("idle"), 2200)
  }

  const isDisabled =
    !inStock ||
    !selectedVariant ||
    !!disabled ||
    status === "adding" ||
    needsChoice
  const label = !selectedVariant
    ? t("product.choose_options")
    : needsChoice
    ? t("product.choose_required_addons")
    : !inStock
    ? t("product.sold_out")
    : status === "adding"
    ? t("product.adding")
    : status === "added"
    ? t("product.added_to_cart")
    : status === "error"
    ? t("product.try_again")
    : t("product.add_to_cart")

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

  if (isPriceOnRequest(product)) {
    return (
      <div className="flex flex-col gap-y-5">
        {(product.variants?.length ?? 0) > 1 &&
          (product.options ?? []).map((option) => (
            <OptionSelect
              key={option.id}
              option={option}
              current={options[option.id]}
              updateOption={setOptionValue}
              title={option.title ?? ""}
              data-testid="product-options"
              disabled={!!disabled}
            />
          ))}
        <QuoteRequest
          productId={product.id}
          variantId={selectedVariant?.id}
          productTitle={productText(product, lang).title}
          whatsapp={whatsapp}
          layout={layout}
        />
      </div>
    )
  }

  const totalWithAddons =
    extra > 0 && variantPrice
      ? convertToLocale({
          amount:
            (Math.round(variantPrice.calculated_price_number * 1000) +
              Math.round(extra * 1000)) /
            1000,
          currency_code: currencyCode,
          locale,
        })
      : null

  return (
    <div className="flex flex-col gap-y-5">
      <ProductPrice product={product} variant={selectedVariant} />
      {talyAvailable && variantPrice && (
        <p className="-mt-3 text-xs text-laly-mut" data-testid="taly-instalments">
          {t("product.taly_before")}{" "}
          <span className="font-bold text-laly-ink tabular-nums">
            {convertToLocale({
              amount:
                Math.round(
                  ((variantPrice.calculated_price_number + extra) / 4) * 1000
                ) / 1000,
              currency_code: currencyCode,
              locale,
            })}
          </span>{" "}
          {t("product.taly_after")}
        </p>
      )}
      {deemaAvailable && variantPrice && (
        <DeemaWidget
          amount={
            Math.round(
              (variantPrice.calculated_price_number + extra) * 1000
            ) / 1000
          }
        />
      )}

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

      <AddonSelector
        groups={addonGroups}
        selection={addons}
        onChange={setAddons}
        currencyCode={currencyCode}
        disabled={!!disabled || status === "adding"}
      />

      {totalWithAddons && (
        <p
          className="flex items-baseline justify-between gap-3 rounded-btn bg-laly-teal-soft px-4 py-3 text-sm font-bold"
          aria-live="polite"
        >
          <span>{t("product.price_with_addons")}</span>
          <span
            className="text-lg font-extrabold text-laly-teal tabular-nums"
            data-testid="price-with-addons"
          >
            {totalWithAddons}
          </span>
        </p>
      )}

      {selectedVariant && (
        <p
          className={`flex items-center gap-1.5 text-sm font-bold ${
            inStock ? "text-laly-green" : "text-laly-red"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              inStock ? "bg-laly-green" : "bg-laly-red"
            }`}
          />
          {inStock
            ? selectedVariant.manage_inventory &&
              (selectedVariant.inventory_quantity ?? 0) <= 5
              ? t("product.in_stock_few_left", {
                  count: selectedVariant.inventory_quantity ?? 0,
                })
              : t("product.in_stock")
            : t("product.out_of_stock")}
        </p>
      )}

      <div className="flex items-stretch gap-3">
        {/* "+" sits at the start in Arabic (right) and at the end in English (right): − 1 + */}
        <div className="flex items-center rounded-btn border-[1.6px] border-laly-line bg-white ltr:flex-row-reverse">
          <button
            type="button"
            aria-label={t("product.increase_quantity")}
            className="w-10 h-12 text-xl font-bold text-laly-teal disabled:text-laly-faint"
            disabled={quantity >= available}
            onClick={() => setQuantity((q) => Math.min(q + 1, available))}
          >
            +
          </button>
          <span
            className="w-8 text-center font-extrabold tabular-nums"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            type="button"
            aria-label={t("product.decrease_quantity")}
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
            {totalWithAddons ? (
              <span className="text-lg font-extrabold tabular-nums">
                {totalWithAddons}
              </span>
            ) : (
              <ProductPrice
                product={product}
                variant={selectedVariant}
                size="compact"
              />
            )}
          </div>
          {addButton("flex-1 h-12")}
        </div>
      )}
    </div>
  )
}
