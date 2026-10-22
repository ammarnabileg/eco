"use client"

import { useState } from "react"

import { useT } from "@i18n/client"
import { submitInstallRequest } from "@lib/data/install"
import GovernorateSelect from "@modules/checkout/components/governorate-select"
import Icon from "@modules/laly/components/icon"

const SERVICES = ["cctv", "networking", "smart_home", "intercom", "other"] as const

const field =
  "w-full h-12 rounded-btn border border-laly-line bg-white px-4 text-[15px] text-laly-ink outline-none focus:border-laly-teal transition-colors"

// The booking form. The day is the customer's preference; staff confirm the
// actual appointment on WhatsApp, so the form promises nothing about times.
export default function InstallForm({ whatsapp }: { whatsapp: string | null }) {
  const t = useT()
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const get = (k: string) => String(f.get(k) ?? "")
    setError(null)
    if (!get("governorate")) return setError(t("service.error_governorate"))
    setState("sending")
    const result = await submitInstallRequest({
      customer_name: get("customer_name"),
      phone: get("phone"),
      governorate: get("governorate"),
      area: get("area"),
      service: get("service"),
      preferred_date: get("preferred_date"),
      message: get("message"),
      website: get("website"),
    })
    if (result.ok) setState("sent")
    else {
      setState("idle")
      setError(result.error)
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="bg-white border border-laly-line rounded-card p-6 small:p-8 text-center">
        <span className="mx-auto w-14 h-14 rounded-full bg-laly-teal-soft text-laly-teal flex items-center justify-center">
          <Icon name="check" size={28} />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-laly-ink">{t("service.sent_title")}</h2>
        <p className="mt-2 text-laly-mut">{t("service.sent_body")}</p>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-btn border border-laly-line px-5 py-3 font-bold text-laly-teal hover:border-laly-teal"
          >
            <Icon name="chat" size={18} />
            {t("service.whatsapp_cta")}
          </a>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-laly-line rounded-card shadow-laly p-4 small:p-7 grid gap-4" noValidate={false}>
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-laly-ink">
        <Icon name="wrench" size={20} className="text-laly-teal" />
        {t("service.form_title")}
      </h2>
      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold">
          {t("service.name")} <span className="text-red-500">*</span>
        </span>
        <input name="customer_name" required minLength={2} maxLength={120} autoComplete="name" className={field} placeholder={t("service.name_placeholder")} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold">
          {t("service.phone")} <span className="text-red-500">*</span>
        </span>
        <input
          name="phone"
          required
          type="tel"
          dir="ltr"
          pattern="\+?[0-9 ]{8,16}"
          autoComplete="tel"
          className={`${field} rtl:text-end`}
          placeholder="+965 9XXX XXXX"
        />
      </label>
      <div className="grid gap-4 xsmall:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-bold">
            {t("service.governorate")} <span className="text-red-500">*</span>
          </span>
          <GovernorateSelect name="governorate" required defaultValue="" placeholder={t("service.governorate_placeholder")} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-bold">{t("service.area")}</span>
          <input name="area" maxLength={120} className={field} placeholder={t("service.area_placeholder")} />
        </label>
      </div>
      <div className="grid gap-4 xsmall:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-bold">
            {t("service.service")} <span className="text-red-500">*</span>
          </span>
          <select name="service" required defaultValue="" className={field}>
            <option value="" disabled>
              {t("service.service_placeholder")}
            </option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {t(`service.service_${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-bold">{t("service.preferred_date")}</span>
          <input name="preferred_date" type="date" min={today} className={field} />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-[13px] font-bold">{t("service.message")}</span>
        <textarea name="message" rows={3} maxLength={1000} className={`${field} h-auto py-3`} placeholder={t("service.message_placeholder")} />
      </label>
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <p className="text-[12.5px] text-laly-mut">{t("service.date_note")}</p>
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
        {state === "sending" ? t("service.sending") : t("service.submit")}
      </button>
    </form>
  )
}
