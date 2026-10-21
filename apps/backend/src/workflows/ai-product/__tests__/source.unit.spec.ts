import { assertPublicUrl, extractPage, focusedText } from "../source"

describe("extractPage", () => {
  const html = `<html><head><title>Archer AX55 | TP-Link</title>
    <meta property="og:image" content="https://static.tp-link.com/ax55-main.png">
    <script>var x = "<p>not text</p>"</script><style>.a{}</style></head>
    <body><h1>Archer AX55</h1><p>AX3000 Dual&nbsp;Band Wi-Fi 6</p>
    <img src="/upload/ax55-side.jpg"><img src="/img/logo.png"><img data-src="https://cdn.x/ax55-back.webp" src="data:image/gif;base64,AAA">
    <img srcset="/a-320.jpg 320w, /a-1200.jpg 1200w"><img src="/icon-cart.svg"></body></html>`
  const page = extractPage(html, "https://www.tp-link.com/ae/home-networking/wifi-router/archer-ax55/")

  it("keeps the readable text without scripts or styles", () => {
    expect(page.title).toBe("Archer AX55 | TP-Link")
    expect(page.text).toContain("AX3000 Dual Band Wi-Fi 6")
    expect(page.text).not.toContain("not text")
  })

  it("collects product images as absolute links, skipping logos, icons and placeholders", () => {
    expect(page.images).toEqual([
      "https://static.tp-link.com/ax55-main.png",
      "https://www.tp-link.com/upload/ax55-side.jpg",
      "https://cdn.x/ax55-back.webp",
      "https://www.tp-link.com/a-1200.jpg",
    ])
  })
})

describe("assertPublicUrl", () => {
  it("refuses plain http and private addresses", async () => {
    await expect(assertPublicUrl("http://example.com")).rejects.toThrow("https")
    await expect(assertPublicUrl("https://127.0.0.1/x")).rejects.toThrow("not allowed")
    await expect(assertPublicUrl("https://192.168.1.10/x")).rejects.toThrow("not allowed")
    await expect(assertPublicUrl("https://[::1]/x")).rejects.toThrow("not allowed")
  })
})

describe("focusedText", () => {
  const page = `<html><head>
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"TP-Link"},
      {"@type":"Product","name":"Archer AX55","model":"Archer AX55","brand":{"@type":"Brand","name":"TP-Link"},
       "additionalProperty":[{"@type":"PropertyValue","name":"Ethernet Ports","value":"4","unitText":"x Gigabit"}]}]}</script>
    <script>var tracking = "<p>Tracking text</p>"</script></head><body>
    <header><a href="/">Home</a><a href="/routers">All routers</a></header>
    <nav>${Array.from({ length: 50 }, (_, i) => `<a>Menu link ${i}</a>`).join("")}</nav>
    <main><h1>Archer AX55</h1><p>AX3000 Dual-Band Wi-Fi 6 Router</p>
      <table><tr><th>Wireless Standards</th><td>IEEE 802.11ax</td></tr><tr><th>Processor</th><td>1.5 GHz Tri-Core CPU</td></tr></table>
      <dl><dt>USB</dt><dd>1× USB 3.0</dd></dl>
      <div class="related-products"><h3>Archer AX73</h3><p>Another router</p></div>
      <p>AX3000 Dual-Band Wi-Fi 6 Router</p></main>
    <footer>Privacy policy · Terms</footer></body></html>`
  const text = focusedText(page)

  it("puts structured data and specification rows first", () => {
    expect(text.indexOf("## STRUCTURED DATA")).toBe(0)
    expect(text).toContain("brand: TP-Link")
    expect(text).toContain("Ethernet Ports: 4 x Gigabit")
    expect(text).toContain("Wireless Standards: IEEE 802.11ax")
    expect(text).toContain("USB: 1× USB 3.0")
    expect(text.indexOf("## SPECIFICATIONS")).toBeLessThan(text.indexOf("## PAGE TEXT"))
  })

  it("leaves out menus, header, footer, related products, scripts and repeats", () => {
    for (const noise of ["Menu link", "All routers", "Privacy policy", "Archer AX73", "Tracking text"]) expect(text).not.toContain(noise)
    expect(text.match(/AX3000 Dual-Band Wi-Fi 6 Router/g)).toHaveLength(1)
  })

  it("stays within the size limit on huge pages", () => {
    const huge = `<main>${Array.from({ length: 5000 }, (_, i) => `<p>Marketing paragraph number ${i} that keeps going.</p>`).join("")}</main>`
    const out = focusedText(huge)
    expect(out.length).toBeGreaterThan(11_000)
    expect(out.length).toBeLessThanOrEqual(12_000)
  })
})
