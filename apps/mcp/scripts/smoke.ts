/**
 * Self-check: starts the built server over stdio against a running Medusa
 * backend, exercises the tools, and exits non-zero on failure. Writes are
 * reverted. Run: pnpm build && MEDUSA_ADMIN_API_KEY=sk_... pnpm smoke
 */
import { strict as assert } from "node:assert"
import { Client } from "@modelcontextprotocol/client"
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio"

type Result = { isError?: boolean; content: { type: string; text?: string }[]; structuredContent?: unknown }

const client = new Client({ name: "laly-smoke", version: "1.0.0" })
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: {
      ...getDefaultEnvironment(),
      MEDUSA_BACKEND_URL: process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000",
      MEDUSA_ADMIN_API_KEY: process.env.MEDUSA_ADMIN_API_KEY ?? "",
    },
  })
)

const call = async (name: string, args: Record<string, unknown> = {}) => {
  const res = (await client.callTool({ name, arguments: args })) as Result
  const text = res.content.map((c) => c.text ?? "").join("\n")
  return { ...res, text }
}
const must = async (name: string, args: Record<string, unknown> = {}) => {
  const res = await call(name, args)
  assert.ok(!res.isError, `${name} failed: ${res.text}`)
  return res
}

const { tools } = await client.listTools()
console.error(`tools: ${tools.map((t) => t.name).join(", ")}`)
assert.ok(tools.length >= 15)

// Content: read, change WhatsApp, restore.
const content = await must("laly_get_store_content", { response_format: "json" })
const before = (content.structuredContent as { settings: { whatsapp: string | null } }).settings.whatsapp
await must("laly_update_contact", { whatsapp: "+965 5555 1234" })
const after = await must("laly_get_store_content", { response_format: "json" })
assert.equal((after.structuredContent as { settings: { whatsapp: string } }).settings.whatsapp, "+965 5555 1234")
await must("laly_update_contact", { whatsapp: before ?? "" })

// Products and offers: create a one-day 10% offer, check it, delete it.
// Priced products (many Hikvision cameras are sold by quotation).
const search = await must("laly_search_products", { q: "Archer", response_format: "json" })
const products = (search.structuredContent as { products: { handle: string }[] }).products
assert.ok(products.length > 0, "expected Archer products")

// Catalog: spec fields are listed, and an unknown spec key is rejected.
const catalog = await must("laly_get_product_catalog", { product: products[0].handle, response_format: "json" })
const fields = (catalog.structuredContent as { attributes: { key: string }[] }).attributes
assert.ok(fields.some((f) => f.key === "wifi_standard"), "expected router spec fields")
const badSpec = await call("laly_update_product_catalog", { product: products[0].handle, specs: { colour: "red" } })
assert.ok(badSpec.isError && badSpec.text.includes("colour"), "unknown spec key should be rejected")
await must("laly_list_quote_requests")
const ends = new Date(Date.now() + 86_400_000).toISOString()
const created = await must("laly_create_offer", {
  title: "اختبار",
  ends_at: ends,
  items: [{ product: products[0].handle, discount_percent: 10 }],
})
const offerId = /\((plist_[A-Z0-9]+)\)/.exec(created.text)?.[1]
assert.ok(offerId, `no offer id in: ${created.text}`)
const offers = await must("laly_list_offers", { response_format: "json" })
assert.ok((offers.structuredContent as { offers: { id: string; state: string }[] }).offers.some((o) => o.id === offerId && o.state === "running"))
await must("laly_delete_offer", { id: offerId })

// Orders are readable.
await must("laly_list_orders")

// Bad input comes back as a readable tool error.
const bad = await call("laly_create_offer", { title: "x", ends_at: "tomorrow", items: [] })
assert.equal(bad.isError, true)
const past = await call("laly_create_offer", {
  title: "x",
  ends_at: "2020-01-01T00:00:00+03:00",
  items: [{ product: products[0].handle, discount_percent: 10 }],
})
assert.equal(past.isError, true)
assert.match(past.text, /past/)

await client.close()
console.error("Smoke test passed")
