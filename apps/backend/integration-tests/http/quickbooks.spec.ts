import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

jest.setTimeout(120 * 1000)

process.env.QUICKBOOKS_CLIENT_ID = "qb-client"
process.env.QUICKBOOKS_CLIENT_SECRET = "qb-secret"
process.env.QUICKBOOKS_ENCRYPTION_KEY = "test-encryption-key"
process.env.QUICKBOOKS_REDIRECT_URI = "http://localhost:9000/quickbooks/callback"

// A stand-in for Intuit's OAuth and the QuickBooks Online API, installed on
// fetch for Intuit hosts only (the test app runs in this process).
const qbo = {
  tokenCalls: [] as Record<string, string>[],
  creates: [] as { entity: string; body: Record<string, unknown>; requestid: string | null }[],
  nextId: 100,
  refreshCount: 0,
}
const realFetch = global.fetch
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } })

beforeAll(() => {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
    if (url.hostname === "oauth.platform.intuit.com") {
      const form = Object.fromEntries(new URLSearchParams(String(init?.body)))
      qbo.tokenCalls.push(form)
      const n = form.grant_type === "refresh_token" ? ++qbo.refreshCount : 0
      return json({ access_token: `access-${n}`, refresh_token: `refresh-${n}`, expires_in: 3600, x_refresh_token_expires_in: 8640000 })
    }
    if (url.hostname === "developer.api.intuit.com") {
      return json({})
    }
    if (url.hostname === "sandbox-quickbooks.api.intuit.com") {
      const path = url.pathname.replace(/^\/v3\/company\/[^/]+\//, "")
      if (path.startsWith("companyinfo")) return json({ CompanyInfo: { CompanyName: "Laly Test Co" } })
      if (path === "query") {
        const q = url.searchParams.get("query") ?? ""
        if (q.includes("from Account") && q.includes("'Income'")) {
          return json({ QueryResponse: { Account: [{ Id: "79", Name: "Sales of Product Income", AccountType: "Income" }] } })
        }
        if (q.includes("from Account")) {
          return json({ QueryResponse: { Account: [{ Id: "4", Name: "Undeposited Funds", AccountType: "Other Current Asset" }] } })
        }
        return json({ QueryResponse: {} })
      }
      const entity = { item: "Item", customer: "Customer", paymentmethod: "PaymentMethod", invoice: "Invoice", salesreceipt: "SalesReceipt", refundreceipt: "RefundReceipt" }[path]
      if (entity && init?.method === "POST") {
        const body = JSON.parse(String(init.body))
        qbo.creates.push({ entity, body, requestid: url.searchParams.get("requestid") })
        return json({ [entity]: { ...body, Id: String(body.Id ?? qbo.nextId++), SyncToken: "0" } })
      }
      return json({ Fault: { Error: [{ code: "404", Message: "unknown" }] } }, 404)
    }
    return realFetch(input as RequestInfo, init)
  }) as typeof fetch
})
afterAll(() => {
  global.fetch = realFetch
})

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: { headers: Record<string, string> }

    beforeEach(async () => {
      qbo.tokenCalls = []
      qbo.creates = []
      const container = getContainer()
      const user = await container.resolve(Modules.USER).createUsers({ email: "admin@test.local" })
      const authIdentity = await container.resolve(Modules.AUTH).createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.local" }],
        app_metadata: { user_id: user.id },
      })
      const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig
      const token = generateJwtToken(
        { actor_id: user.id, actor_type: "user", auth_identity_id: authIdentity.id },
        { secret: http.jwtSecret, expiresIn: "1h" }
      )
      adminHeaders = { headers: { authorization: `Bearer ${token}` } }
    })

    const connect = async () => {
      const { data } = await api.post("/admin/quickbooks/connect", {}, adminHeaders)
      const state = new URL(data.url).searchParams.get("state")!
      const res = await api.get(`/quickbooks/callback?code=auth-code&state=${encodeURIComponent(state)}&realmId=9130`, {
        maxRedirects: 0,
        validateStatus: () => true,
      })
      return res
    }

    it("connects with a signed state, stores tokens encrypted and picks default accounts", async () => {
      const forged = await api.get("/quickbooks/callback?code=x&state=forged&realmId=1", {
        maxRedirects: 0,
        validateStatus: () => true,
      })
      expect(forged.headers.location).toContain("error=")

      const res = await connect()
      expect(res.headers.location).toContain("/app/quickbooks?connected=1")
      expect(qbo.tokenCalls[0]).toMatchObject({ grant_type: "authorization_code", code: "auth-code" })

      const { data } = await api.get("/admin/quickbooks", adminHeaders)
      expect(data.connection).toMatchObject({
        realm_id: "9130",
        company_name: "Laly Test Co",
        income_account_id: "79",
        deposit_account_id: "4",
        currency: "KWD",
      })
      expect(JSON.stringify(data)).not.toContain("access-0")

      const svc = getContainer().resolve("quickbooks") as { getConnection: () => Promise<{ access_token: string }> }
      expect((await svc.getConnection()).access_token).not.toContain("access-0")
    })

    it("books an order once, with lines that add up, after syncing its items", async () => {
      await connect()
      const container = getContainer()
      const { data: region } = await api.post(
        "/admin/regions",
        { name: "Kuwait", currency_code: "kwd", countries: ["kw"] },
        adminHeaders
      )
      const { data: product } = await api.post(
        "/admin/products",
        {
          title: "Archer BE230",
          status: "published",
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            { title: "Default", sku: "ARCHER-BE230", manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 27.9, currency_code: "kwd" }] },
          ],
        },
        adminHeaders
      )
      await api.post("/admin/quickbooks/sync", { products: [product.product.id] }, adminHeaders)
      const item = qbo.creates.find((c) => c.entity === "Item" && String(c.body.Name).includes("ARCHER-BE230"))
      expect(item?.body).toMatchObject({ Type: "NonInventory", UnitPrice: 27.9, IncomeAccountRef: { value: "79" } })

      const { result: order } = await createOrderWorkflow(container).run({
        input: {
          region_id: region.region.id,
          email: "buyer@laly.test",
          currency_code: "kwd",
          shipping_address: { first_name: "Ahmad", last_name: "Ali", country_code: "kw", phone: "+96599991234" },
          items: [{ variant_id: product.product.variants[0].id, quantity: 2, unit_price: 27.9, title: "Archer BE230" }],
        },
      })

      const first = await api.post("/admin/quickbooks/sync", { orders: [order.id] }, adminHeaders)
      expect(first.data.results[0]).toMatchObject({ ok: true })
      const invoice = qbo.creates.find((c) => c.entity === "Invoice")
      expect(invoice?.requestid).toBe(`order-${order.id}`.slice(0, 50))
      expect(invoice?.body).toMatchObject({ CurrencyRef: { value: "KWD" }, BillEmail: { Address: "buyer@laly.test" } })
      const lines = invoice!.body.Line as { Amount: number }[]
      expect(lines.reduce((s, l) => s + l.Amount, 0)).toBeCloseTo(55.8, 3)
      expect(qbo.creates.filter((c) => c.entity === "Customer")).toHaveLength(1)

      // A second sync of the same order books nothing new.
      const before = qbo.creates.length
      await api.post("/admin/quickbooks/sync", { orders: [order.id] }, adminHeaders)
      expect(qbo.creates.length).toBe(before)
    })

    it("refreshes an expired access token once and keeps the rotated refresh token", async () => {
      await connect()
      const svc = getContainer().resolve("quickbooks") as {
        getConnection: () => Promise<{ id: string; refresh_token: string }>
        updateQbConnections: (d: Record<string, unknown>) => Promise<unknown>
      }
      const connection = await svc.getConnection()
      await svc.updateQbConnections({ id: connection.id, access_expires_at: new Date(Date.now() - 1000) })
      await api.get("/admin/quickbooks/accounts", adminHeaders)
      const refreshes = qbo.tokenCalls.filter((c) => c.grant_type === "refresh_token")
      expect(refreshes).toHaveLength(1)
      expect(refreshes[0].refresh_token).toBe("refresh-0")
      expect((await svc.getConnection()).refresh_token).not.toBe(connection.refresh_token)
    })
  },
})
