import { createHmac } from "node:crypto"

import { needsAttention, parseQboEvents, verifyIntuitSignature } from "../webhook"

const sign = (body: string, key: string) => createHmac("sha256", key).update(body).digest("base64")

describe("QuickBooks webhook", () => {
  it("accepts only Intuit's signature over the exact body", () => {
    const body = '[{"id":"1"}]'
    expect(verifyIntuitSignature(body, sign(body, "verifier"), "verifier")).toBe(true)
    expect(verifyIntuitSignature(body, sign(body, "other"), "verifier")).toBe(false)
    expect(verifyIntuitSignature(`${body} `, sign(body, "verifier"), "verifier")).toBe(false)
    expect(verifyIntuitSignature(body, undefined, "verifier")).toBe(false)
    expect(verifyIntuitSignature(body, sign(body, ""), "")).toBe(false)
  })

  it("reads CloudEvents", () => {
    const [voided, merged] = parseQboEvents([
      { id: "ev-1", type: "qbo.invoice.voided.v1", intuitentityid: "130", intuitaccountid: "9130", time: "2026-10-18T10:00:00Z" },
      { id: "ev-2", type: "qbo.customer.merged.v1", intuitentityid: "7", intuitaccountid: "9130", data: { deletedid: "8" } },
    ])
    expect(voided).toMatchObject({ key: "ev-1", entity: "Invoice", entity_id: "130", operation: "void", realm_id: "9130" })
    expect(merged).toMatchObject({ entity: "Customer", operation: "merge", merged_id: "8" })
  })

  it("reads the legacy format with a stable key per change", () => {
    const body = {
      eventNotifications: [
        {
          realmId: "9130",
          dataChangeEvent: {
            entities: [{ name: "SalesReceipt", id: "55", operation: "Delete", lastUpdated: "2026-10-18T10:00:00Z" }],
          },
        },
      ],
    }
    const [e] = parseQboEvents(body)
    expect(e).toMatchObject({ entity: "SalesReceipt", entity_id: "55", operation: "delete" })
    expect(parseQboEvents(body)[0].key).toBe(e.key)
  })

  it("ignores junk and flags changes to booked records except e-mails", () => {
    expect(parseQboEvents([{ type: "nonsense" }, null].filter(Boolean))).toEqual([])
    expect(parseQboEvents({})).toEqual([])
    const e = parseQboEvents([{ id: "x", type: "qbo.invoice.emailed.v1", intuitentityid: "1", intuitaccountid: "r" }])[0]
    expect(needsAttention(e, true)).toBe(false)
    expect(needsAttention({ ...e, operation: "update" }, true)).toBe(true)
    expect(needsAttention({ ...e, operation: "delete" }, false)).toBe(false)
  })
})
