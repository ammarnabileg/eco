import { brandOf, classify, groupProducts, mpnOf, parseAttributes, parseCsv, seriesOf, toDraft } from "../botble"

const csv = [
  "ID,Name,Slug,URL,SKU,Categories,Brand,Image,Images,Price,Product Attributes,Import Type,Is Variation Default,Labels,Product Collections",
  '1,"5-Port Desktop Switch (LS105G)",ls105g,https://old/ls105g,X,Switches,Tp Link,https://cdn/a.jpg,"https://cdn/a.jpg,https://cdn/b.jpg",6.5,"Part No TP-Link,PoE Support / PoE Ports",product,,Hot,',
  '2,"5-Port Desktop Switch (LS105G)",,,,,,,,6.5,"Part No TP-Link:LS105G,PoE Support / PoE Ports:4-Port PoE",variation,1,,',
  '3,"5-Port Desktop Switch (LS105G)",,,,,,,,5.25,"Part No TP-Link:LS1005G,PoE Support / PoE Ports:Non-PoE",variation,0,,',
  '4,"4 MP ColorVu Fixed Mini Bullet Network Camera (DS-2CD2047G2-LU(2.8mm))",ds-cam,,,Pro Series,HIKVISION,https://cdn/c.jpg,,0,,product,,,',
].join("\n")

describe("Botble import rules", () => {
  it("parses quoted CSV and attaches variations to their parent", () => {
    const groups = groupProducts(parseCsv(csv))
    expect(groups).toHaveLength(2)
    expect(groups[0].variations).toHaveLength(2)
  })

  it("builds options from the attributes that vary, with Arabic titles", () => {
    const [switchProduct, camera] = groupProducts(parseCsv(csv)).map(toDraft)
    expect(switchProduct.options).toEqual([{ title: "PoE", values: ["4-Port PoE", "Non-PoE"] }])
    expect(switchProduct.variants.map((v) => [v.sku, v.price, v.rank])).toEqual([
      ["LS105G", 6.5, 0],
      ["LS1005G", 5.25, 2],
    ])
    expect(switchProduct.images).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg"])
    expect(switchProduct).toMatchObject({ category: "switches", brand: "tp-link", mpn: "LS105G", labels: ["Hot"] })

    expect(camera).toMatchObject({
      category: "bullet-cameras",
      brand: "hikvision",
      mpn: "DS-2CD2047G2-LU",
      series: "Pro Series",
      price_on_request: true,
    })
  })

  it("reads model numbers and ignores parentheses that are not models", () => {
    expect(mpnOf("BE3600 Dual-Band Wi-Fi 7 Router (ARCHER BE230)")).toBe("Archer BE230")
    expect(mpnOf("48-Port Gigabit Rackmount Switch (TL SG1048)")).toBe("TL-SG1048")
    expect(mpnOf("AX3000 Wall Plate WiFi 6 Access Point (V1)")).toBeNull()
    expect(mpnOf("Kaspersky Plus (3 Devices)")).toBeNull()
    expect(mpnOf("5G AX3000 Gateway (Availability based on regions)")).toBeNull()
  })

  it("trusts the product name over a wrong brand column", () => {
    expect(brandOf("Smart Temperature & Humidity Monitor (TAPO T315)", "HIKVISION")).toBe("tapo")
    expect(brandOf("VIGI 32 Channel Network Video Recorder", "HIKVISION")).toBe("vigi")
    expect(brandOf("AX1500 WiFi 6 Router", "Mercusys - Powered By TP-Link")).toBe("mercusys")
  })

  it("maps names to the new tree and drops discontinued lines", () => {
    expect(classify("Robot Vacuum (TAPO RV10 LITE)", "Robot Vacuums")).toBeNull()
    expect(classify("8 MP Panoramic ColorVu Fixed Bullet Network Camera (DS-2CD2T87G3P)", "")).toBe("panoramic-cameras")
    expect(classify("Smart Floodlight Camera (TAPO C720)", "")).toBe("wifi-cameras")
    expect(classify("AX3000 Mesh WiFi 6 Extender (RE715X)", "")).toBe("range-extenders")
    expect(classify("4G+ AX3000 Whole Home Mesh WiFi 6 Gateway", "")).toBe("mesh-wifi")
    expect(classify("AC1200 Wireless Dual Band 4G LTE Router (ARCHER MR402)", "")).toBe("mobile-routers")
    expect(classify("Smart Light Switch, 1-Gang 1-Way (TAPO S210)", "")).toBe("smart-plugs-switches")
    expect(seriesOf("Pro Series,Network Cameras")).toBe("Pro Series")
  })

  it("splits attributes on declared names so values may contain commas", () => {
    expect(
      parseAttributes("Edition:Premium,Supported Operating Systems:Windows, macOS, Android", [
        "Edition",
        "Supported Operating Systems",
      ])
    ).toEqual({ Edition: "Premium", "Supported Operating Systems": "Windows, macOS, Android" })
  })
})
