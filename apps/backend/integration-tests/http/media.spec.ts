import { createServer, Server } from "node:http"
import { AddressInfo } from "node:net"
import { existsSync } from "node:fs"
import { join } from "node:path"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import sharp from "sharp"

import { clearIntegrationCache } from "../../src/modules/integrations/store"

// Uploads go to the server's disk until "تخزين الصور" is switched on in the
// admin; then to R2 (a stand-in S3 server here), converted to WebP.

jest.setTimeout(90 * 1000)

type Seen = { method: string; path: string; type?: string; auth?: string; size: number }
const seen: Seen[] = []
let fake: Server
let endpoint = ""

beforeAll(async () => {
  fake = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () => {
      seen.push({
        method: req.method!,
        path: decodeURIComponent(req.url!.split("?")[0]),
        type: req.headers["content-type"],
        auth: req.headers.authorization,
        size: Buffer.concat(chunks).length,
      })
      res.statusCode = req.method === "DELETE" ? 204 : 200
      res.setHeader("ETag", '"abc"')
      res.end()
    })
  })
  await new Promise<void>((resolve) => fake.listen(0, "127.0.0.1", resolve))
  endpoint = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((resolve) => fake.close(() => resolve())))

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let admin: { headers: Record<string, string> }
    beforeEach(async () => {
      seen.length = 0
      clearIntegrationCache()
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const identity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      admin = {
        headers: {
          authorization: `Bearer ${generateJwtToken(
            { actor_id: user.id, actor_type: "user", auth_identity_id: identity.id },
            { secret: http.jwtSecret, expiresIn: "1h" }
          )}`,
        },
      }
    })

    const upload = async (name: string, width: number) => {
      const png = await sharp({ create: { width, height: width / 2, channels: 3, background: "#0E7C8A" } }).png().toBuffer()
      const form = new FormData()
      form.append("files", new Blob([png], { type: "image/png" }), name)
      const { data } = await api.post("/admin/uploads", form, admin)
      return data.files[0] as { id: string; url: string }
    }

    it("stores on the server's disk while R2 is off", async () => {
      const file = await upload("Hikvision Camera.png", 2400)
      expect(file.url).toMatch(/^http:\/\/localhost:9000\/static\/hikvision-camera-[a-z0-9]+\.webp$/)
      const onDisk = join(process.cwd(), "static", decodeURIComponent(file.url.split("/static/")[1]))
      expect(existsSync(onDisk)).toBe(true)
      expect(await sharp(onDisk).metadata()).toMatchObject({ format: "webp", width: 2000 })
      await api.delete(`/admin/uploads/${encodeURIComponent(file.id)}`, admin)
      expect(existsSync(onDisk)).toBe(false)
      expect(seen).toHaveLength(0)
    })

    it("stores in the R2 bucket folder once it is switched on, and deletes there", async () => {
      await api.post(
        "/admin/integrations/media",
        {
          enabled: true,
          values: {
            access_key_id: "test-key",
            secret_access_key: "test-secret",
            bucket: "shop",
            endpoint,
            public_url: "https://media.example.com/",
            prefix: "laly",
            naming: "uuid",
            webp: "on",
          },
        },
        admin
      )
      const file = await upload("router.png", 800)
      expect(file.url).toMatch(/^https:\/\/media\.example\.com\/laly\/[0-9a-f-]{36}\.webp$/)
      expect(seen[0]).toMatchObject({ method: "PUT", type: "image/webp" })
      expect(seen[0].path).toMatch(/^\/shop\/laly\/[0-9a-f-]{36}\.webp$/)
      expect(seen[0].auth).toContain("AWS4-HMAC-SHA256 Credential=test-key/")
      expect(seen[0].size).toBeGreaterThan(0)

      await api.delete(`/admin/uploads/${encodeURIComponent(file.id)}`, admin)
      expect(seen[1]).toMatchObject({ method: "DELETE", path: seen[0].path })

      // The secret never goes back to the browser.
      const { data } = await api.get("/admin/integrations", admin)
      expect(JSON.stringify(data)).not.toContain("test-secret")
    })
  },
})
