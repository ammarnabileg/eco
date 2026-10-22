import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// A small in-memory limit for public forms (installation bookings, quotes):
// enough to stop a script from flooding staff with requests. It counts per
// server process, which is what this store runs.

type Hits = number[]
const buckets = new Map<string, Hits>()

/** The visitor's address; behind Coolify's proxy it is the first X-Forwarded-For entry. */
export const clientIp = (req: MedusaRequest) =>
  String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || req.ip || "unknown"

export function hit(key: string, max: number, windowMs: number, now = Date.now()) {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    buckets.set(key, recent)
    return false
  }
  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 10_000) buckets.delete(buckets.keys().next().value!)
  return true
}

export const resetRateLimits = () => buckets.clear()

/** At most `max` requests per visitor address in `windowMs` for this route. */
export function rateLimit(name: string, max: number, windowMs: number) {
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    if (!hit(`${name}:${clientIp(req)}`, max, windowMs)) {
      res.status(429).json({ type: "too_many_requests", message: "Too many requests, please try again later." })
      return
    }
    next()
  }
}
