"use client"

import { useState } from "react"

import { useT } from "@i18n/client"
import { submitAfterSalesRequest, TrackedOrder } from "@lib/data/aftersales"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import { field } from "../track-form"

const KINDS = ["return", "exchange", "warranty"] as const
const REASONS = ["defective", "wrong_item", "not_as_described", "changed_mind", "other"] as const

// Items and quantities, request type, reason and details. Sending it only
// records the request for staff: nothing is approved or refunded automatically.
export default function ReturnForm({
  order,
  signedIn,
}: {
  order: Pick<TrackedOrder, "id" | "display_id" | "items">
  signedIn: boolean
}) {
  const t = useT()
  const [qty, setQty] = useState<Record<string, number>>({})
  const [kind, setKind] = useState<string>("")
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const get = (k: string) => String(f.get(k) ?? "")
    const items = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([line_item_id, quantity]) => ({ line_item_id, quantity }))
    setError(null)
    if (!items.length) return setError(t("aftersales.error_items"))
    if (!kind) return setError(t("aftersales.error_kind"))
    if (!get("reason")) return setError(t("aftersales.error_reason"))
    setState("sending")
    const res = await submitAfterSalesRequest({
      order_id: order.id,
      kind,
      reason: get("reason"),
      details: get("details"),
      phone: get("phone"),
      items,
      website: get("website"),
    })
    if (res.ok) setState("sent")
    else {
      setState("idle")
      setError(res.error)
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="bg-white border border-laly-line rounded-card p-6 small:p-8 text-center">
        <span className="mx-auto w-14 h-14 rounded-full bg-laly-teal-soft text-laly-teal flex items-center justify-center">
          <Icon name="check" size={28} />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-laly-ink">{t("aftersales.sent_title")}</h2>
        <p className="mt-2 text-laly-mut">{t("aftersales.sent_body", { id: order.display_id })}</p>
        {signedIn && (
          <LocalizedClientLink
            href="/account/support"
            className="mt-5 inline-flex items-center gap-2 rounded-btn border border-laly-line px-5 py-3 font-bold text-laly-teal hover:border-laly-teal"
          >
            {t("aftersales.my_requests_link")}
          </LocalizedClientLink>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-laly-line rounded-card shadow-laly p-4 small:p-7 grid gap-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-laly-ink">
        <Icon name="ret" size={20} className="text-laly-teal" />
        {t("aftersales.order_title", { id: order.display_id })}
      </h2>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-bold">
          {t("aftersales.pick_items")} <span className="text-red-500">*</span>
        </legend>
        {order.items.map((item) => {
          const value = qty[item.id] ?? 0
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-btn border border-laly-line px-3 py-2.5">
              <span className="flex-1 min-w-0">
                <bdi className="block font-bold text-laly-ink truncate">{item.title}</bdi>
                {item.variant_title && <bdi className="block text-[12.5px] text-laly-mut">{item.variant_title}</bdi>}
              </span>
              <select
                aria-label={t("aftersales.quantity", { count: value })}
                value={value}
                onChange={(e) => setQty({ ...qty, [item.id]: Number(e.target.value) })}
                className="h-10 rounded-btn border border-laly-line bg-white px-3 text-[15px]"
              >
                {Array.from({ length: item.quantity + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-bold">
          {t("aftersales.kind")} <span className="text-red-500">*</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <label
              key={k}
              className={`h-11 rounded-btn border flex items-center justify-center font-bold cursor-pointer transition-colors ${
                kind === k ? "border-laly-teal bg-laly-teal-soft text-laly-teal" : "border-laly-line text-laly-ink"
              }`}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {t(`aftersales.kind_${k}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold">
          {t("aftersales.reason")} <span className="text-red-500">*</span>
        </span>
        <select name="reason" required defaultValue="" className={field}>
          <option value="" disabled>
            {t("aftersales.reason_placeholder")}
          </option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`aftersales.reason_${r}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold">{t("aftersales.details")}</span>
        <textarea
          name="details"
          rows={4}
          maxLength={2000}
          className={`${field} h-auto py-3`}
          placeholder={t("aftersales.details_placeholder")}
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold">{t("aftersales.contact_phone")}</span>
        <input
          name="phone"
          type="tel"
          dir="ltr"
          pattern="\+?[0-9 ]{8,16}"
          autoComplete="tel"
          className={`${field} rtl:text-end`}
          placeholder="+965 9XXX XXXX"
        />
        <span className="text-[12.5px] text-laly-mut">{t("aftersales.contact_phone_hint")}</span>
      </label>

      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <p className="text-[12.5px] text-laly-mut">{t("aftersales.how_note")}</p>
      {error && (
        <p role="alert" className="text-[13.5px] font-bold text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        className="h-12 rounded-btn bg-laly-teal hover:bg-laly-teal-d disabled:opacity-60 text-white font-extrabold flex items-center justify-center gap-2 transition-colors"
      >
        <Icon name="check" size={18} />
        {state === "sending" ? t("aftersales.sending") : t("aftersales.submit")}
      </button>
    </form>
  )
}
