import { createHmac } from "node:crypto"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils"
import {
  capturePaymentWorkflow,
  createOrderPaymentCollectionWorkflow,
  createOrderWorkflow,
} from "@medusajs/medusa/core-flows"

import { syncCaptureToQuickbooksWorkflow } from "../../src/workflows/quickbooks"

jest.setTimeout(120 * 1000)

process.env.QUICKBOOKS_CLIENT_ID = "qb-client"
process.env.QUICKBOOKS_CLIENT_SECRET = "qb-secret"
process.env.QUICKBOOKS_ENCRYPTION_KEY = "test-encryption-key"
process.env.QUICKBOOKS_REDIRECT_URI = "http://localhost:9000/quickbooks/callback"

// A stand-in for Intuit's OAuth and the QuickBooks Online API, installed on
// fetch for Intuit hosts only (the test app runs in this process).
const qbo = {
  tokenCalls: [] as Record<string, string>[],
  creates: [] as { entity: string; id: string; body: Record<string, unknown>; requestid: string | null }[],
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
      if (path === "preferences") {
        return json({ Preferences: { CurrencyPrefs: { HomeCurrency: { value: "USD" }, MultiCurrencyEnabled: true } } })
      }
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
      const [kind, readId] = path.split("/")
      const entities: Record<string, string> = { item: "Item", customer: "Customer", paymentmethod: "PaymentMethod", invoice: "Invoice", salesreceipt: "SalesReceipt", refundreceipt: "RefundReceipt", payment: "Payment" }
      if (readId && (!init?.method || init.method === "GET")) {
        const found = qbo.creates.find((c) => c.entity === entities[kind] && c.id === readId)
        if (found) {
          const total = (found.body.Line as { Amount: number; DetailType: string }[]).reduce(
            (s, l) => s + (l.DetailType === "DiscountLineDetail" ? -l.Amount : l.Amount),
            0
          )
          return json({ [found.entity]: { ...found.body, Id: readId, SyncToken: "0", Balance: Math.round(total * 100) / 100 } })
        }
      }
      const entity = entities[path]
      if (entity && init?.method === "POST") {
        // Like QuickBooks: requestid is limited to 50 characters as encoded in the URL.
        const rawRequestId = url.search.match(/[?&]requestid=([^&]*)/)?.[1] ?? ""
        if (rawRequestId.length > 50) {
          return json({ Fault: { Error: [{ code: "6000", Message: "request_id too long" }] } }, 400)
        }
        const body = JSON.parse(String(init.body))
        const id = String(body.Id ?? qbo.nextId++)
        qbo.creates.push({ entity, id, body, requestid: url.searchParams.get("requestid") })
        return json({ [entity]: { ...body, Id: id, SyncToken: "0" } })
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

    it("books a fils-priced order to 2 decimals and keeps the exact total in the note", async () => {
      await connect()
      const { data: region } = await api.post(
        "/admin/regions",
        { name: "Kuwait", currency_code: "kwd", countries: ["kw"] },
        adminHeaders
      )
      const { data: product } = await api.post(
        "/admin/products",
        {
          title: "Cable",
          status: "published",
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            { title: "Default", sku: "CABLE-1", manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 9.995, currency_code: "kwd" }] },
          ],
        },
        adminHeaders
      )
      await api.post("/admin/quickbooks/sync", { products: [product.product.id] }, adminHeaders)
      const { result: order } = await createOrderWorkflow(getContainer()).run({
        input: {
          region_id: region.region.id,
          email: "buyer@laly.test",
          currency_code: "kwd",
          shipping_address: { first_name: "Ahmad", last_name: "Ali", country_code: "kw", phone: "+96599991234" },
          items: [{ variant_id: product.product.variants[0].id, quantity: 1, unit_price: 9.995, title: "Cable" }],
        },
      })

      const { data } = await api.post("/admin/quickbooks/sync", { orders: [order.id] }, adminHeaders)
      expect(data.results[0]).toMatchObject({ ok: true })
      // 9.995 rounds to 10.00 in QuickBooks: no rounding line, the overshoot
      // goes to the discount; the note keeps the exact store total.
      const invoice = qbo.creates.find((c) => c.entity === "Invoice")!
      const lines = invoice.body.Line as { Amount: number; DetailType: string }[]
      const total = lines.reduce((s, l) => s + (l.DetailType === "DiscountLineDetail" ? -l.Amount : l.Amount), 0)
      expect(Math.round(total * 100) / 100).toBe(10)
      expect(String(invoice.body.PrivateNote)).toContain("9.995 KWD")
      expect(qbo.creates.some((c) => c.entity === "Item" && String(c.body.Name).startsWith("Rounding"))).toBe(true)
    })

    it("records a later capture as a Payment against the order's invoice", async () => {
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
          title: "Tapo C200",
          status: "published",
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            { title: "Default", sku: "TAPO-C200", manage_inventory: false, options: { Default: "Default" }, prices: [{ amount: 12.5, currency_code: "kwd" }] },
          ],
        },
        adminHeaders
      )
      await api.post("/admin/quickbooks/sync", { products: [product.product.id] }, adminHeaders)
      const { result: order } = await createOrderWorkflow(container).run({
        input: {
          region_id: region.region.id,
          email: "cod@laly.test",
          currency_code: "kwd",
          shipping_address: { first_name: "Sara", last_name: "Ali", country_code: "kw", phone: "+96599990000" },
          items: [{ variant_id: product.product.variants[0].id, quantity: 1, unit_price: 12.5, title: "Tapo C200" }],
        },
      })
      await api.post("/admin/quickbooks/sync", { orders: [order.id] }, adminHeaders)
      const invoice = qbo.creates.find((c) => c.entity === "Invoice")!

      // Cash on delivery: the payment is captured after the order was booked.
      const { result: collections } = await createOrderPaymentCollectionWorkflow(container).run({
        input: { order_id: order.id, amount: 12.5 },
      })
      const payments = container.resolve(Modules.PAYMENT)
      const session = await payments.createPaymentSession(collections[0].id, {
        provider_id: "pp_system_default",
        amount: 12.5,
        currency_code: "kwd",
        data: {},
      })
      const payment = (await payments.authorizePaymentSession(session.id, {}))!
      await capturePaymentWorkflow(container).run({ input: { payment_id: payment.id } })

      await syncCaptureToQuickbooksWorkflow(container).run({ input: payment.id })
      await syncCaptureToQuickbooksWorkflow(container).run({ input: payment.id })
      const booked = qbo.creates.filter((c) => c.entity === "Payment")
      expect(booked).toHaveLength(1)
      expect(booked[0].body).toMatchObject({
        TotalAmt: 12.5,
        Line: [{ Amount: 12.5, LinkedTxn: [{ TxnId: invoice.id, TxnType: "Invoice" }] }],
      })
      expect(booked[0].requestid).toBe(`capture-${payment.id}`.slice(0, 50))
    })

    it("records signed webhook events once and flags changes to what the store booked", async () => {
      await connect()
      const container = getContainer()
      await api.post(
        "/admin/integrations/quickbooks",
        { values: { webhook_verifier: "verifier-token" } },
        adminHeaders
      )
      const svc = container.resolve("quickbooks") as {
        createQbSyncRecords: (d: Record<string, unknown>) => Promise<unknown>
      }
      await svc.createQbSyncRecords({ entity: "order", local_id: "order_123", qb_type: "Invoice", qb_id: "130", status: "synced" })

      const events = [
        { id: "ev-void", type: "qbo.invoice.voided.v1", intuitentityid: "130", intuitaccountid: "9130", time: "2026-10-18T10:00:00Z" },
        { id: "ev-other", type: "qbo.invoice.created.v1", intuitentityid: "999", intuitaccountid: "9130" },
        { id: "ev-foreign", type: "qbo.invoice.voided.v1", intuitentityid: "130", intuitaccountid: "other-company" },
      ]
      const body = JSON.stringify(events)
      const post = (raw: string, signature: string) =>
        api.post("/hooks/quickbooks", raw, {
          headers: { "content-type": "application/json", "intuit-signature": signature },
          validateStatus: () => true,
          transformRequest: [(d: unknown) => d],
        })
      const signature = createHmac("sha256", "verifier-token").update(body).digest("base64")

      expect((await post(body, "forged")).status).toBe(401)
      const first = await post(body, signature)
      expect(first.data).toEqual({ received: 2 })
      // Intuit retries: nothing is recorded twice.
      expect((await post(body, signature)).data).toEqual({ received: 0 })

      const { data } = await api.get("/admin/quickbooks/events", adminHeaders)
      expect(data.count).toBe(1)
      expect(data.events[0]).toMatchObject({ entity: "Invoice", operation: "void", local_entity: "order", local_id: "order_123" })

      await api.post(`/admin/quickbooks/events/${data.events[0].id}/review`, {}, adminHeaders)
      expect((await api.get("/admin/quickbooks/events", adminHeaders)).data.count).toBe(0)
      expect((await api.get("/admin/quickbooks/events?all=1", adminHeaders)).data.count).toBe(2)
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
