import { SearchTypes } from "@medusajs/framework/types"

import MeilisearchSearchService from "../service"

// Runs against a real Meilisearch (CI starts one). Skipped when none is set.
const host = process.env.MEILISEARCH_TEST_HOST
const apiKey = process.env.MEILISEARCH_TEST_API_KEY ?? ""
const suite = host ? describe : describe.skip

const index: SearchTypes.ResolvedSearchIndexDefinition = {
  name: "product",
  entity: "product",
  primary_key: "id",
  provider: "meilisearch",
  physical_name: `product_test_${Date.now()}`,
  definition_hash: "test",
  settings: { typo_tolerance: { enabled: true } },
  fields: {
    id: { type: "keyword", filterable: true, retrievable: true },
    title: { type: "text", searchable: { weight: 3 }, sortable: true, retrievable: true },
    category: { type: "keyword", array: true, filterable: true, facetable: true, retrievable: true },
    price: { type: "float", filterable: true, sortable: true, facetable: true, retrievable: true },
    on_sale: { type: "boolean", filterable: true, facetable: true, retrievable: true },
    created_at: { type: "date", sortable: true, filterable: true, retrievable: true },
  },
  seed: async function* () {},
}

const docs = [
  { id: "p1", title: "كاميرا Hikvision Bullet دقة 2MP", category: ["كاميرات"], price: 12.5, on_sale: true, created_at: "2026-01-01T00:00:00.000Z" },
  { id: "p2", title: "كاميرا Tapo C200 منزلية Wi-Fi", category: ["كاميرات"], price: 9.9, on_sale: false, created_at: "2026-02-01T00:00:00.000Z" },
  { id: "p3", title: "راوتر TP-Link Archer C6 AC1200", category: ["الشبكات"], price: 12.9, on_sale: false, created_at: "2026-03-01T00:00:00.000Z" },
  { id: "p4", title: "لمبة Tapo L530E ذكية Wi-Fi", category: ["البيت الذكي"], price: 3.5, on_sale: true, created_at: "2026-04-01T00:00:00.000Z" },
]

suite("Meilisearch provider (live)", () => {
  jest.setTimeout(60_000)
  const provider = new MeilisearchSearchService({}, { host: host!, apiKey })
  const search = (q: string | undefined, extra: Partial<SearchTypes.ProviderSearchQuery> = {}) =>
    provider.search({ index, q, attributes_to_retrieve: ["title", "price", "created_at"], ...extra })
  const titles = (r: SearchTypes.SearchResult) => r.hits.map((h) => String(h.document.title))

  beforeAll(async () => {
    await provider.upsertIndex({ index })
    const task = await provider.upsertDocuments({ index: index.physical_name, definition: index, documents: docs })
    await provider.waitForTask(task)
  })

  afterAll(async () => {
    await provider.deleteIndex({ index: index.physical_name })
  })

  it("forgives Arabic spelling variants and typos", async () => {
    expect(titles(await search("كاميره"))).toHaveLength(2)
    expect(titles(await search("كامرا"))).toHaveLength(2)
  })

  it("matches Arabic/English synonyms, brands written in Arabic, and phrases", async () => {
    expect(titles(await search("router"))[0]).toContain("راوتر")
    expect(titles(await search("هيك فيجن"))[0]).toContain("Hikvision")
    expect(titles(await search("شي يقوي النت في البيت"))[0]).toContain("راوتر")
  })

  it("filters, sorts, and returns dates as ISO strings", async () => {
    const r = await search(undefined, {
      filters: { price: { $gte: 5, $lte: 13 } },
      pagination: { order: { price: "ASC" } },
    })
    expect(r.hits.map((h) => h.document.price)).toEqual([9.9, 12.5, 12.9])
    expect(r.hits[0].document.created_at).toBe("2026-02-01T00:00:00.000Z")

    const recent = await search(undefined, { filters: { created_at: { $gte: "2026-03-01T00:00:00.000Z" } } })
    expect(recent.metadata.count).toBe(2)
  })

  it("counts disjunctive facets without the facet's own filter", async () => {
    const r = await search(undefined, {
      filters: { category: ["كاميرات"] },
      search_options: { facets: ["category", "on_sale", { field: "price", type: "stats" }], disjunctive_facets: true },
    })
    expect(r.metadata.count).toBe(2)
    const category = r.facets?.category as Extract<SearchTypes.SearchFacetResult, { type: "value" }>
    expect(category.values.map((v) => v.value).sort()).toEqual(["البيت الذكي", "الشبكات", "كاميرات"].sort())
    const onSale = r.facets?.on_sale as Extract<SearchTypes.SearchFacetResult, { type: "value" }>
    expect(onSale.values.reduce((n, v) => n + v.count, 0)).toBe(2)
    expect(r.facets?.price).toMatchObject({ type: "stats", min: 9.9, max: 12.5 })
  })

  it("never returns the whole catalogue for a stop-word-only query fallback", async () => {
    const r = await search("شي في")
    expect(r.hits.length).toBeLessThan(docs.length)
  })

  it("deletes documents by filter", async () => {
    const task = await provider.deleteDocuments({ index: index.physical_name, filters: { id: ["p4"] } })
    await provider.waitForTask(task)
    expect((await search(undefined)).metadata.count).toBe(3)
  })
})
