import { rankRecommendations } from "../score"

const p = (id: string, categories: string[], brand: string | null = null) => ({ id, categories, brand })

describe("rankRecommendations", () => {
  const candidates = [
    p("router-tp", ["routers"], "tplink"),
    p("router-other", ["routers"], "asus"),
    p("cam-tp", ["cameras"], "tplink"),
    p("cable", ["cables"]),
    p("bought", ["routers"], "tplink"),
  ]

  it("prefers what matches past purchases, then views, and never repeats them", () => {
    const ids = rankRecommendations({
      candidates,
      purchased: [p("bought", ["routers"], "tplink")],
      viewed: [p("cam-x", ["cameras"])],
      sales: {},
      limit: 10,
    })
    expect(ids[0]).toBe("router-tp") // bought category and brand
    expect(ids.at(-1)).toBe("cable") // nothing in common
    expect(ids).not.toContain("bought")
  })

  it("falls back to best sellers for a new visitor", () => {
    const ids = rankRecommendations({ candidates, purchased: [], viewed: [], sales: { cable: 9, "cam-tp": 3 }, limit: 2 })
    expect(ids).toEqual(["cable", "cam-tp"])
  })
})
