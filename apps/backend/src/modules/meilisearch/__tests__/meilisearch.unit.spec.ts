import { toMeiliFilter } from "../filters"
import { buildSynonyms, rewriteQuery } from "../language"

const lookup = (path: string) =>
  path === "created_at"
    ? { isArray: false, isDate: true }
    : path === "category"
      ? { isArray: true, isDate: false }
      : undefined

describe("toMeiliFilter", () => {
  it("translates equality, lists, and escapes strings", () => {
    expect(toMeiliFilter({ status: "published" })).toBe('status = "published"')
    expect(toMeiliFilter({ category: ["كاميرات", 'a"b'] }, lookup)).toBe(
      'category IN ["كاميرات", "a\\"b"]'
    )
    expect(toMeiliFilter({ on_sale_kwd: true })).toBe("on_sale_kwd = true")
    expect(toMeiliFilter({ thumbnail: null })).toBe("thumbnail IS NULL")
  })

  it("translates operators, ranges, and logical groups", () => {
    expect(toMeiliFilter({ min_price_kwd: { $gte: 5, $lt: 20 } })).toBe(
      "(min_price_kwd >= 5) AND (min_price_kwd < 20)"
    )
    expect(
      toMeiliFilter({
        $or: [{ category: "a" }, { labels: { $nin: ["x"] } }],
        $not: { status: "draft" },
        q: "ignored",
      })
    ).toBe('((category = "a") OR (labels NOT IN ["x"])) AND (NOT (status = "draft"))')
  })

  it("stores dates as epoch milliseconds", () => {
    expect(toMeiliFilter({ created_at: { $gt: "2026-01-01T00:00:00.000Z" } }, lookup)).toBe(
      `created_at > ${Date.parse("2026-01-01T00:00:00.000Z")}`
    )
  })

  it("omits fields for disjunctive facet queries", () => {
    expect(toMeiliFilter({ category: "a", status: "published" }, lookup, new Set(["category"]))).toBe(
      'status = "published"'
    )
  })

  it("rejects unsupported patterns", () => {
    expect(() => toMeiliFilter({ title: { $like: "a_b%" } })).toThrow(/not supported/)
  })
})

describe("Arabic search vocabulary", () => {
  it("rewrites known phrases inside a sentence", () => {
    expect(rewriteQuery("شي يقوي النت في البيت")).toBe("شي راوتر في البيت")
    expect(rewriteQuery("  ابي   كاميرا للحوش ")).toBe("ابي كاميرا")
    expect(rewriteQuery("ابي مقوي شبكة")).toBe("ابي مقوي")
    expect(rewriteQuery("كاميرا مراقبة للمكتب")).toBe("كاميرا للمكتب")
  })

  it("adds the ال form of Arabic synonyms", () => {
    const synonyms = buildSynonyms()
    // A word that starts a multi-word key loses its own synonyms in Meilisearch.
    expect(synonyms["مقوي شبكة"]).toBeUndefined()
    expect(synonyms["مقوي"]).toContain("extender")
    expect(synonyms["واي فاي"]).toContain("wifi")
    expect(synonyms["النت"]).toEqual(expect.arrayContaining(["راوتر"]))
    expect(synonyms["هيك فيجن"]).toEqual(expect.arrayContaining(["hikvision"]))
    expect(synonyms["router"]).toEqual(expect.arrayContaining(["راوتر"]))
  })
})
