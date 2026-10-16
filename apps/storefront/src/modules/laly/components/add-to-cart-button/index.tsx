"use client"

import { useParams } from "next/navigation"
import { useState, useTransition } from "react"

import { addToCart } from "@lib/data/cart"
import Icon from "@modules/laly/components/icon"

export default function AddToCartButton({
  variantId,
  disabled,
}: {
  variantId?: string
  disabled?: boolean
}) {
  const { countryCode } = useParams() as { countryCode: string }
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<"idle" | "added" | "error">("idle")

  const handleClick = () => {
    if (!variantId) {
      return
    }
    startTransition(async () => {
      try {
        await addToCart({ variantId, quantity: 1, countryCode })
        setState("added")
      } catch {
        setState("error")
      }
      setTimeout(() => setState("idle"), 2000)
    })
  }

  const label = disabled
    ? "نفدت الكمية"
    : isPending
      ? "جاري الإضافة…"
      : state === "added"
        ? "تمت الإضافة"
        : state === "error"
          ? "حاول مرة أخرى"
          : "أضف للسلة"

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending || !variantId}
      aria-live="polite"
      className={`w-full h-10 rounded-btn flex items-center justify-center gap-2 text-[13px] font-bold transition-colors disabled:cursor-not-allowed ${
        state === "added"
          ? "bg-laly-green text-white"
          : disabled
            ? "bg-laly-line text-laly-faint"
            : "bg-laly-teal-soft text-laly-teal hover:bg-laly-teal hover:text-white"
      }`}
      data-testid="add-product-button"
    >
      <Icon name={state === "added" ? "check" : "cart"} size={17} />
      {label}
    </button>
  )
}
