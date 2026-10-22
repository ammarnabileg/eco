"use server"

import { getT } from "@i18n/server"
import { sdk } from "@lib/config"

// Guest phone check on WhatsApp before paying (required when switched on in
// the admin). The backend enforces it too; this only drives the form.

export type OtpStatus = { required: boolean; verified: boolean; phone: string | null }

export const getOtpStatus = async (cartId: string): Promise<OtpStatus> =>
  sdk.client
    .fetch<OtpStatus>("/store/whatsapp/otp", { method: "GET", query: { cart_id: cartId }, cache: "no-store" })
    .catch(() => ({ required: false, verified: true, phone: null }))

// Backend error text → message key shown to the customer.
const ERROR_KEYS: Record<string, string> = {
  "Too many codes requested": "checkout.otp_error_too_many",
  "Add a valid phone number": "checkout.otp_error_invalid_phone",
  "The code expired": "checkout.otp_error_expired",
  "Wrong code": "checkout.otp_error_wrong",
}
const errorText = async (e: unknown) => {
  const msg = (e as Error)?.message ?? ""
  const key = Object.entries(ERROR_KEYS).find(([k]) => msg.includes(k))?.[1] ?? "checkout.otp_error_send_failed"
  return (await getT())(key)
}

export async function sendOtp(cartId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await sdk.client.fetch("/store/whatsapp/otp", { method: "POST", body: { cart_id: cartId } })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: await errorText(e) }
  }
}

export async function verifyOtp(cartId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await sdk.client.fetch("/store/whatsapp/otp/verify", { method: "POST", body: { cart_id: cartId, code } })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: await errorText(e) }
  }
}
