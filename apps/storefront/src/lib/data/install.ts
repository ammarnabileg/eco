"use server"

import { sdk } from "@lib/config"
import { getLocale, getT } from "@i18n/server"
import { getAuthHeaders } from "./cookies"

export type InstallRequestInput = {
  customer_name: string
  phone: string
  governorate: string
  area?: string
  service: string
  preferred_date?: string
  message?: string
  product_id?: string
  /** Honeypot; must stay empty. */
  website?: string
}

export type InstallRequestResult = { ok: true } | { ok: false; error: string }

export async function submitInstallRequest(input: InstallRequestInput): Promise<InstallRequestResult> {
  const [t, locale, headers] = await Promise.all([getT(), getLocale(), getAuthHeaders()])
  return sdk.client
    .fetch("/store/install-requests", {
      method: "POST",
      headers,
      body: {
        customer_name: input.customer_name.trim(),
        phone: input.phone.trim(),
        governorate: input.governorate,
        area: input.area?.trim() || undefined,
        service: input.service,
        preferred_date: input.preferred_date || undefined,
        message: input.message?.trim() || undefined,
        product_id: input.product_id || undefined,
        locale,
        website: input.website ?? "",
      },
    })
    .then(() => ({ ok: true as const }))
    .catch((e: Error & { status?: number }) => ({
      ok: false as const,
      error: e.status === 429 || /too many/i.test(e.message) ? t("service.error_too_many") : t("service.error_generic"),
    }))
}
