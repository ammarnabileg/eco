"use server"

import { sdk } from "@lib/config"

// Guest phone check on WhatsApp before paying (required when switched on in
// the admin). The backend enforces it too; this only drives the form.

export type OtpStatus = { required: boolean; verified: boolean; phone: string | null }

export const getOtpStatus = async (cartId: string): Promise<OtpStatus> =>
  sdk.client
    .fetch<OtpStatus>("/store/whatsapp/otp", { method: "GET", query: { cart_id: cartId }, cache: "no-store" })
    .catch(() => ({ required: false, verified: true, phone: null }))

const ARABIC: Record<string, string> = {
  "Too many codes requested": "طلبت رموز كتير. جرّب بعد شوية.",
  "Add a valid phone number": "أضف رقم موبايل صحيح في عنوان التوصيل.",
  "The code expired": "الرمز انتهى. اطلب رمز جديد.",
  "Wrong code": "الرمز غير صحيح.",
}
const arabic = (e: unknown) => {
  const msg = (e as Error)?.message ?? ""
  return Object.entries(ARABIC).find(([k]) => msg.includes(k))?.[1] ?? "تعذر الإرسال على واتساب. جرّب مرة أخرى."
}

export async function sendOtp(cartId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await sdk.client.fetch("/store/whatsapp/otp", { method: "POST", body: { cart_id: cartId } })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: arabic(e) }
  }
}

export async function verifyOtp(cartId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await sdk.client.fetch("/store/whatsapp/otp/verify", { method: "POST", body: { cart_id: cartId, code } })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: arabic(e) }
  }
}
