"use client"

import { useT } from "@i18n/client"
import { sendOtp, verifyOtp } from "@lib/data/whatsapp"
import { richText } from "@lib/util/rich-text"
import { Button } from "@modules/common/components/ui"
import { useEffect, useState } from "react"

const RESEND_AFTER = 60

/** Guests confirm their phone with a 6-digit code sent on WhatsApp. */
export default function WhatsappOtp({
  cartId,
  phone,
  onVerified,
}: {
  cartId: string
  phone: string | null
  onVerified: () => void
}) {
  const t = useT()
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const send = async () => {
    setBusy(true)
    setError(null)
    const res = await sendOtp(cartId)
    setBusy(false)
    if (res.ok) {
      setSent(true)
      setCode("")
      setWait(RESEND_AFTER)
    } else setError(res.error ?? null)
  }
  const verify = async () => {
    setBusy(true)
    setError(null)
    const res = await verifyOtp(cartId, code)
    setBusy(false)
    if (res.ok) onVerified()
    else setError(res.error ?? null)
  }

  return (
    <div className="mb-6 rounded-xl border border-laly-line bg-white p-4" data-testid="whatsapp-otp">
      <p className="text-sm font-bold text-laly-ink">{t("checkout.otp_title")}</p>
      <p className="mt-1 text-xs text-laly-mut">
        {phone
          ? richText(t("checkout.otp_body_phone"), { phone: <span dir="ltr">{phone}</span> })
          : t("checkout.otp_body")}
      </p>
      {!sent ? (
        <Button size="small" variant="secondary" className="mt-3" isLoading={busy} disabled={!phone} onClick={send}>
          {t("checkout.otp_send")}
        </Button>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            className="w-32 rounded-lg border border-laly-line px-3 py-2 text-center tracking-[0.4em]"
            aria-label={t("checkout.otp_code_aria")}
          />
          <Button size="small" isLoading={busy} disabled={code.length !== 6} onClick={verify}>
            {t("checkout.otp_confirm")}
          </Button>
          <button
            type="button"
            className="text-xs text-laly-mut underline disabled:no-underline disabled:opacity-60"
            onClick={send}
            disabled={busy || wait > 0}
          >
            {wait > 0 ? t("checkout.otp_resend_in", { seconds: wait }) : t("checkout.otp_resend")}
          </button>
        </div>
      )}
      {!phone && (
        <p className="mt-2 text-xs text-laly-mut">{t("checkout.otp_no_phone")}</p>
      )}
      {sent && !error && (
        <p className="mt-2 text-xs text-laly-mut">{t("checkout.otp_valid_for")}</p>
      )}
      {error && <p className="mt-2 text-xs text-laly-red" role="alert">{error}</p>}
    </div>
  )
}
