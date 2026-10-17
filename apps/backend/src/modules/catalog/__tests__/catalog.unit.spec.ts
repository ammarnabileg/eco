import { resolveAddonSelection } from "../addons"
import {
  mergeAttributes,
  SpecAttribute,
  specFacets,
  specTable,
  specText,
  templateErrors,
  validateSpecs,
} from "../specs"

const attributes: SpecAttribute[] = [
  { key: "resolution_mp", label_ar: "الدقة", label_en: "Resolution", type: "number", unit: "MP", filterable: true, required: true },
  {
    key: "night_vision",
    label_ar: "الرؤية الليلية",
    label_en: "Night vision",
    type: "select",
    filterable: true,
    options: [
      { value: "colorvu", label_ar: "ملونة ColorVu", label_en: "ColorVu" },
      { value: "ir", label_ar: "أشعة تحت الحمراء", label_en: "Infrared" },
    ],
  },
  { key: "built_in_mic", label_ar: "مايك مدمج", label_en: "Built-in mic", type: "boolean", filterable: true },
  { key: "protection", label_ar: "الحماية", label_en: "Protection", type: "text" },
]

describe("spec templates", () => {
  it("rejects bad keys, duplicates and selects without options", () => {
    const errors = templateErrors([
      { key: "Bad Key", label_ar: "x", label_en: "x", type: "text" },
      { key: "lens", label_ar: "x", label_en: "x", type: "select" },
      { key: "lens", label_ar: "x", label_en: "x", type: "text" },
    ])
    expect(errors).toHaveLength(3)
  })

  it("keeps the first definition of a key when merging templates", () => {
    const merged = mergeAttributes([
      { attributes: [attributes[0]] },
      { attributes: [{ ...attributes[0], label_en: "Other" }, attributes[1]] },
    ])
    expect(merged.map((a) => a.label_en)).toEqual(["Resolution", "Night vision"])
  })
})

describe("validateSpecs", () => {
  it("coerces numbers and booleans and drops empty values", () => {
    const { specs, errors } = validateSpecs(attributes, {
      resolution_mp: "4",
      night_vision: "colorvu",
      built_in_mic: "true",
      protection: "",
    })
    expect(errors).toEqual([])
    expect(specs).toEqual({ resolution_mp: 4, night_vision: "colorvu", built_in_mic: true })
  })

  it("reports unknown keys, invalid options and missing required fields", () => {
    const { errors } = validateSpecs(attributes, { night_vision: "laser", colour: "red" })
    expect(errors).toHaveLength(3)
    expect(errors).toEqual(
      expect.arrayContaining([
        'Night vision: "laser" is not one of the options',
        '"colour" is not a field of this product\'s categories',
        "Resolution is required",
      ])
    )
  })

  it("accepts translated free text", () => {
    const { specs } = validateSpecs(attributes, {
      resolution_mp: 2,
      protection: { ar: "مقاومة للماء IP67", en: "IP67 weatherproof" },
    })
    expect(specs.protection).toEqual({ ar: "مقاومة للماء IP67", en: "IP67 weatherproof" })
  })
})

describe("search projections", () => {
  const specs = { resolution_mp: 4, night_vision: "colorvu", built_in_mic: true, protection: "IP67" }

  it("emits facets for filterable fields only", () => {
    expect(specFacets(attributes, specs)).toEqual([
      "resolution_mp:4",
      "night_vision:colorvu",
      "built_in_mic:true",
    ])
  })

  it("renders option labels in both languages for keyword search", () => {
    expect(specText(attributes, specs)).toBe("4 MP · ملونة ColorVu ColorVu · IP67")
  })
})

describe("specTable", () => {
  it("groups rows and renders labels, units and yes/no in both languages", () => {
    const grouped: SpecAttribute[] = attributes.map((a, i) => ({
      ...a,
      group_ar: i < 2 ? "الصورة" : "عام",
      group_en: i < 2 ? "Image" : "General",
    }))
    const table = specTable(grouped, { resolution_mp: 4, night_vision: "colorvu", built_in_mic: false })
    expect(table.map((g) => g.group_en)).toEqual(["Image", "General"])
    expect(table[0].rows.map((r) => [r.value_ar, r.value_en])).toEqual([
      ["4 MP", "4 MP"],
      ["ملونة ColorVu", "ColorVu"],
    ])
    expect(table[1].rows[0]).toMatchObject({ value_ar: "لا", value_en: "No" })
  })
})

describe("resolveAddonSelection", () => {
  const groups = [
    {
      id: "adgp_ram",
      name_ar: "الرام",
      name_en: "RAM",
      selection: "single" as const,
      options: [
        { id: "adop_16", name_ar: "16GB", name_en: "16GB", price: "12.5" },
        { id: "adop_32", name_ar: "32GB", name_en: "32GB", price: 24.75 },
      ],
    },
    {
      id: "adgp_ssd",
      name_ar: "SSD إضافي",
      name_en: "Extra SSD",
      selection: "multiple" as const,
      options: [
        { id: "adop_1tb", name_ar: "1TB", name_en: "1TB", price: { numeric: 19.9 } },
        { id: "adop_off", name_ar: "x", name_en: "x", price: 1, is_active: false },
      ],
    },
  ]

  it("prices the selection from the rows, rounded to fils", () => {
    const { total, errors, selected } = resolveAddonSelection(groups, ["adop_1tb", "adop_16"])
    expect(errors).toEqual([])
    expect(total).toBe(32.4)
    expect(selected.map((s) => s.option_id)).toEqual(["adop_16", "adop_1tb"])
  })

  it("rejects two options in a single-choice group and unknown or inactive ids", () => {
    expect(resolveAddonSelection(groups, ["adop_16", "adop_32"]).errors).toEqual([
      "Pick one option from RAM",
    ])
    expect(resolveAddonSelection(groups, ["adop_off"]).errors).toEqual([
      "Some options are not available for this product",
    ])
  })

  it("enforces required groups", () => {
    const required = [{ ...groups[0], is_required: true }]
    expect(resolveAddonSelection(required, []).errors).toEqual(["RAM is required"])
  })
})
