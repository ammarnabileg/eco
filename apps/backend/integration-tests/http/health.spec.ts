import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api }) => {
    describe("Health and store access", () => {
      it("responds on /health", async () => {
        const response = await api.get("/health")
        expect(response.status).toEqual(200)
      })

      it("rejects store requests without a publishable key", async () => {
        const response = await api.get("/store/products").catch((e) => e.response)
        expect(response.status).toEqual(400)
      })
    })
  },
})
