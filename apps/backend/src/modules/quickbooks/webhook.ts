import { createHmac, timingSafeEqual } from "node:crypto"

// QuickBooks webhook payloads: signature check and normalisation of both
// formats (CloudEvents, current; eventNotifications, legacy). Pure, tested.

/** Base64 HMAC-SHA256 of the raw body with the app's verifier token. */
export function verifyIntuitSignature(raw: Buffer | string, signature: string | undefined, verifier: string) {
  if (!signature || !verifier) return false
  const expected = createHmac("sha256", verifier).update(raw).digest("base64")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export type QboEvent = {
  key: string
  realm_id: string
  /** Entity name as QuickBooks writes it: Invoice, SalesReceipt, Item... */
  entity: string
  entity_id: string
  /** create | update | delete | void | merge | emailed | ... (lowercase). */
  operation: string
  occurred_at: string | null
  /** For merges: the id that was merged away. */
  merged_id: string | null
}

const NAMES: Record<string, string> = {
  invoice: "Invoice",
  salesreceipt: "SalesReceipt",
  refundreceipt: "RefundReceipt",
  payment: "Payment",
  item: "Item",
  customer: "Customer",
  paymentmethod: "PaymentMethod",
  creditmemo: "CreditMemo",
}
const entityName = (s: string) => NAMES[s.toLowerCase()] ?? s

// "qbo.invoice.voided.v1" -> void; "created" -> create
const verb = (s: string) => {
  const v = s.toLowerCase()
  const map: Record<string, string> = {
    created: "create",
    updated: "update",
    deleted: "delete",
    voided: "void",
    merged: "merge",
    emailed: "emailed",
  }
  return map[v] ?? v
}

export function parseQboEvents(body: unknown): QboEvent[] {
  const out: QboEvent[] = []
  if (Array.isArray(body)) {
    for (const e of body as Record<string, unknown>[]) {
      const parts = String(e.type ?? "").split(".")
      if (parts.length < 3 || !e.intuitentityid) continue
      const data = (e.data ?? {}) as Record<string, unknown>
      out.push({
        key: String(e.id ?? `${e.intuitaccountid}:${e.type}:${e.intuitentityid}:${e.time}`),
        realm_id: String(e.intuitaccountid ?? ""),
        entity: entityName(parts[1]),
        entity_id: String(e.intuitentityid),
        operation: verb(parts[2]),
        occurred_at: typeof e.time === "string" ? e.time : null,
        merged_id: data.deletedid != null ? String(data.deletedid) : null,
      })
    }
    return out
  }
  const notifications = ((body as { eventNotifications?: unknown[] })?.eventNotifications ?? []) as {
    realmId?: string
    dataChangeEvent?: { entities?: Record<string, unknown>[] }
  }[]
  for (const n of notifications) {
    for (const e of n.dataChangeEvent?.entities ?? []) {
      const operation = verb(String(e.operation ?? ""))
      out.push({
        key: `${n.realmId}:${e.name}:${e.id}:${operation}:${e.lastUpdated}`,
        realm_id: String(n.realmId ?? ""),
        entity: entityName(String(e.name ?? "")),
        entity_id: String(e.id ?? ""),
        operation,
        occurred_at: typeof e.lastUpdated === "string" ? e.lastUpdated : null,
        merged_id: e.deletedId != null ? String(e.deletedId) : null,
      })
    }
  }
  return out.filter((e) => e.entity_id)
}

// QuickBooks entity -> what the store books as it (qb_sync_record.entity).
export const LOCAL_ENTITY: Record<string, string[]> = {
  Invoice: ["order"],
  SalesReceipt: ["order"],
  RefundReceipt: ["refund"],
  Payment: ["capture"],
  Item: ["variant"],
  Customer: ["customer"],
  PaymentMethod: ["payment_method"],
}

/**
 * Whether staff should look: anything but an e-mail notice on a record the
 * store booked, since QuickBooks then no longer matches the store.
 */
export const needsAttention = (event: QboEvent, linked: boolean) => linked && event.operation !== "emailed"
