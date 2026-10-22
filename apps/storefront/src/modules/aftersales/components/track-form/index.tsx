"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { useT } from "@i18n/client"
import { startTracking, verifyTracking } from "@lib/data/aftersales"
import Icon from "@modules/laly/components/icon"

export const field =
  "w-full h-12 rounded-btn border border-laly-line bg-white px-4 text-[15px] text-laly-ink outline-none focus:border-laly-teal transition-colors"

// Order number + phone, then the WhatsApp code. The first step always moves on
// to the code (the backend never says whether the order exists); after the
// code is verified the page reloads with the order.
export default function TrackForm({ whatsapp, defaultOrder = "" }: { whatsapp: string | null; defaultOrder?: string }) {
  const t = useT()
  const router = useRouter()
  const [step, setStep] = useState<"details" | "code">("details")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [order, setOrder] = useState(defaultOrder)
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")

  async function send(website = "") {
    setBusy(true)
    setError(null)
    const res = await startTracking({ display_id: order, phone, website })
    setBusy(false)
    if (!res.ok) {
      setUnavailable(!!res.unavailable)
      return setError(res.error)
    }
    if (res.status === "verified") return router.refresh()
    setCode("")
    setStep("code")
  }

  async function onDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await send(String(new FormData(e.currentTarget).get("website") ?? ""))
  }

  async function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await verifyTracking({ display_id: order, phone, code })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  const errorBox = error && (
    <div role="alert" className="grid gap-2">
      <p className="text-[13.5px] font-bold text-red-600">{error}</p>
      {unavailable && whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-bold text-laly-teal underline underline-offset-4"
        >
          <Icon name="chat" size={18} />
          {t("aftersales.contact_store")}
        </a>
      )}
    </div>
  )

  if (step === "code") {
    return (
      <form onSubmit={onCode} className="bg-white border border-laly-line rounded-card shadow-laly p-4 small:p-7 grid gap-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-laly-ink">
          <Icon name="shield" size={20} className="text-laly-teal" />
          {t("aftersales.code_sent_title")}
        </h2>
        <p className="text-[13.5px] text-laly-mut">{t("aftersales.code_sent_body")}</p>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-bold">{t("aftersales.code")}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            dir="ltr"
            className={`${field} text-center tracking-[0.4em] text-lg font-bold`}
          />
        </label>
        {errorBox}
        <button
          type="submit"
          disabled={busy}
          className="h-12 rounded-btn bg-laly-teal hover:bg-laly-teal-d disabled:opacity-60 text-white font-extrabold transition-colors"
        >
          {busy ? t("aftersales.verifying") : t("aftersales.verify")}
        </button>
        <div className="flex flex-wrap justify-between gap-3 text-[13.5px] font-bold">
          <button type="button" className="text-laly-teal underline underline-offset-4" onClick={() => setStep("details")}>
            {t("aftersales.change_details")}
          </button>
          <button type="button" disabled={busy} className="text-laly-teal underline underline-offset-4" onClick={() => send()}>
            {t("aftersales.resend")}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={onDetails} className="bg-white border border-laly-line rounded-card shadow-laly p-4 small:p-7 grid gap-4">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-laly-ink">
        <Icon name="truck" size={20} className="text-laly-teal" />
        {t("aftersales.track_title")}
      </h2>
      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold">
          {t("aftersales.order_number")} <span className="text-red-500">*</span>
        </span>
        <input
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          required
          inputMode="numeric"
          dir="ltr"
          maxLength={12}
          className={`${field} rtl:text-end`}
          placeholder={t("aftersales.order_number_placeholder")}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold">
          {t("aftersales.phone")} <span className="text-red-500">*</span>
        </span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          type="tel"
          dir="ltr"
          pattern="\+?[0-9 \-]{8,20}"
          autoComplete="tel"
          className={`${field} rtl:text-end`}
          placeholder="+965 9XXX XXXX"
        />
      </label>
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {errorBox}
      <button
        type="submit"
        disabled={busy}
        className="h-12 rounded-btn bg-laly-teal hover:bg-laly-teal-d disabled:opacity-60 text-white font-extrabold flex items-center justify-center gap-2 transition-colors"
      >
        <Icon name="chat" size={18} />
        {busy ? t("aftersales.sending") : t("aftersales.send_code")}
      </button>
    </form>
  )
}
