import { createHmac, timingSafeEqual } from "node:crypto"

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// A short-lived signed pass to view one order after its phone was verified by
// WhatsApp (or because the signed-in customer owns it). Stateless: it is an
// HMAC over the order id and expiry, keyed with the server's JWT secret.

export const TRACK_TOKEN_TTL_MS = 30 * 60 * 1000
const PURPOSE = "laly-track-order:v1"

const b64 = (s: string) => Buffer.from(s).toString("base64url")
const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(`${PURPOSE}:${payload}`).digest("base64url")

export function signTrackToken(orderId: string, secret: string, now = Date.now()) {
  const expiresAt = now + TRACK_TOKEN_TTL_MS
  const payload = b64(JSON.stringify({ o: orderId, e: expiresAt }))
  return { token: `${payload}.${sign(payload, secret)}`, expires_at: new Date(expiresAt).toISOString() }
}

/** The order id the token grants, or null when it is forged, malformed or expired. */
export function readTrackToken(token: string | null | undefined, secret: string, now = Date.now()): string | null {
  const [payload, sig, extra] = String(token ?? "").split(".")
  if (!payload || !sig || extra !== undefined) return null
  const expected = Buffer.from(sign(payload, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { o, e } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { o?: unknown; e?: unknown }
    if (typeof o !== "string" || !o.startsWith("order_") || typeof e !== "number" || e <= now) return null
    return o
  } catch {
    return null
  }
}

export function trackSecret(container: MedusaContainer): string {
  const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
  // medusa-config refuses to boot in production without a strong JWT secret.
  return String(http.jwtSecret || "supersecret")
}

export const TRACK_TOKEN_HEADER = "x-laly-track-token"
