import sharp from "sharp"

import { objectName, prepareUpload, slugify } from "../process"

const options = { naming: "slug" as const, webp: true, maxDimension: 2000, maxBytes: 5 * 1024 * 1024 }
const png = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 14, g: 124, b: 138 } } }).png().toBuffer()

describe("media uploads", () => {
  it("makes safe names in every mode", () => {
    expect(slugify("كاميرا Hikvision 4MP (جديدة)")).toBe("hikvision-4mp")
    expect(objectName("كاميرا.png", "slug", ".png")).toMatch(/^file-[a-z0-9]+\.png$/)
    expect(objectName("../../etc/My Photo.JPG", "slug", ".jpg")).toMatch(/^my-photo-[a-z0-9]+\.jpg$/)
    expect(objectName("x.png", "uuid", ".webp")).toMatch(/^[0-9a-f-]{36}\.webp$/)
    expect(objectName("كاميرا مراقبة.png", "original", ".png")).toMatch(/^كاميرا-مراقبة-[a-z0-9]+\.png$/)
  })

  it("converts photos to WebP and shrinks only large ones", async () => {
    const big = await prepareUpload({ filename: "Router.png", mimeType: "image/png", content: await png(3000, 1500) }, options)
    expect(big.type).toBe("image/webp")
    expect(big.name).toMatch(/^router-[a-z0-9]+\.webp$/)
    expect(await sharp(big.content).metadata()).toMatchObject({ format: "webp", width: 2000, height: 1000 })

    const small = await prepareUpload({ filename: "a.png", mimeType: "image/png", content: await png(400, 300) }, options)
    expect(await sharp(small.content).metadata()).toMatchObject({ width: 400, height: 300 })
  })

  it("keeps files as they are when the options are off, and leaves non-images alone", async () => {
    const content = await png(3000, 1500)
    const kept = await prepareUpload({ filename: "a.png", mimeType: "image/png", content }, { ...options, webp: false, maxDimension: 0 })
    expect(kept.type).toBe("image/png")
    expect(kept.content.equals(content)).toBe(true)
    const csv = await prepareUpload({ filename: "products.csv", mimeType: "text/csv", content: Buffer.from("a,b") }, options)
    expect(csv).toMatchObject({ type: "text/csv" })
    expect(csv.name).toMatch(/\.csv$/)
  })

  it("refuses files over the size limit", async () => {
    await expect(
      prepareUpload({ filename: "big.bin", mimeType: "application/pdf", content: Buffer.alloc(2 * 1024 * 1024) }, { ...options, maxBytes: 1024 * 1024 })
    ).rejects.toThrow("أكبر من الحد")
  })
})
