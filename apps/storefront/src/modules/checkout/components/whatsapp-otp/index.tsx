"use client"

import { sendOtp, verifyOtp } from "@lib/data/whatsapp"
import { Button } from "@modules/common/components/ui"
import { useState } from "react"

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
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const send = async () => {
    setBusy(true)
    setError(null)
    const res = await sendOtp(cartId)
    setBusy(false)
    if (res.ok) setSent(true)
    else setError(res.error ?? null)
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
      <p className="text-sm font-bold text-laly-ink">تأكيد رقم الموبايل</p>
      <p className="mt-1 text-xs text-laly-mut">
        هنبعتلك رمز تحقق على واتساب{phone ? <> على الرقم <span dir="ltr">{phone}</span></> : null}.
      </p>
      {!sent ? (
        <Button size="small" variant="secondary" className="mt-3" isLoading={busy} onClick={send}>
          إرسال الرمز على واتساب
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
            aria-label="رمز التحقق"
          />
          <Button size="small" isLoading={busy} disabled={code.length !== 6} onClick={verify}>
            تأكيد
          </Button>
          <button type="button" className="text-xs text-laly-mut underline" onClick={send} disabled={busy}>
            إعادة الإرسال
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-laly-red" role="alert">{error}</p>}
    </div>
  )
}
