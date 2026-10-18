import { bnplGatewayOf, CategoryNode, categoryRule, productAllows } from "../bnpl-eligibility"

const cat = (id: string, parent: string | null, bnpl?: Record<string, string>): CategoryNode => ({
  id,
  parent_category_id: parent,
  metadata: bnpl ? { bnpl, seo_title: "kept" } : null,
})

// cameras (deema: allow, taly: deny)
//   └ dome (inherit)
//       └ dome-4k (taly: allow)
// networking (inherit) └ routers (deema: deny)
// misc (inherit, no parent rule)
const tree = new Map(
  [
    cat("cameras", null, { deema: "allow", taly: "deny" }),
    cat("dome", "cameras"),
    cat("dome-4k", "dome", { taly: "allow" }),
    cat("networking", null),
    cat("routers", "networking", { deema: "deny" }),
    cat("misc", null),
  ].map((c) => [c.id, c])
)
const product = (category_ids: string[], bnpl?: Record<string, string>) => ({ metadata: bnpl ? { bnpl } : {}, category_ids })

describe("instalment eligibility", () => {
  it("denies by default: no rule anywhere, or no category at all", () => {
    expect(productAllows(product(["misc"]), "deema", tree)).toBe(false)
    expect(productAllows(product([]), "deema", tree)).toBe(false)
    expect(productAllows(product(["deleted-category"]), "taly", tree)).toBe(false)
  })

  it("allows a product in an allowed category, through nested categories", () => {
    expect(productAllows(product(["cameras"]), "deema", tree)).toBe(true)
    expect(productAllows(product(["dome"]), "deema", tree)).toBe(true)
    expect(categoryRule("dome", "deema", tree)).toBe("allow")
  })

  it("denies a product in a denied category", () => {
    expect(productAllows(product(["routers"]), "deema", tree)).toBe(false)
    expect(productAllows(product(["cameras"]), "taly", tree)).toBe(false)
  })

  it("lets the closest category decide, per gateway independently", () => {
    // dome-4k allows Taly although its grandparent denies it; Deema still inherited.
    expect(productAllows(product(["dome-4k"]), "taly", tree)).toBe(true)
    expect(productAllows(product(["dome-4k"]), "deema", tree)).toBe(true)
  })

  it("denies when the product's categories disagree", () => {
    expect(productAllows(product(["cameras", "routers"]), "deema", tree)).toBe(false)
    // An inheriting category with no rule does not block an allowing one.
    expect(productAllows(product(["cameras", "misc"]), "deema", tree)).toBe(true)
  })

  it("follows the product's explicit setting over any category", () => {
    expect(productAllows(product(["cameras", "routers"], { deema: "allow" }), "deema", tree)).toBe(true)
    expect(productAllows(product(["cameras"], { deema: "deny" }), "deema", tree)).toBe(false)
    expect(productAllows(product([], { taly: "allow" }), "taly", tree)).toBe(true)
    // An explicit Deema rule says nothing about Taly.
    expect(productAllows(product(["cameras"], { deema: "allow" }), "taly", tree)).toBe(false)
  })

  it("ignores unknown values and survives a category loop", () => {
    expect(productAllows(product(["cameras"], { deema: "yes" }), "deema", tree)).toBe(true)
    const loop = new Map([cat("a", "b"), cat("b", "a")].map((c) => [c.id, c]))
    expect(categoryRule("a", "deema", loop)).toBeNull()
  })

  it("knows which providers are instalment gateways", () => {
    expect(bnplGatewayOf("pp_deema_deema")).toBe("deema")
    expect(bnplGatewayOf("pp_taly_taly")).toBe("taly")
    expect(bnplGatewayOf("pp_klickpay_knet")).toBeNull()
  })
})
