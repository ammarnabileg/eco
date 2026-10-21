import { assertPublicUrl, extractPage } from "../source"

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
