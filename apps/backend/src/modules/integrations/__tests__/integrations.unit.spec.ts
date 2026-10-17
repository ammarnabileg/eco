import { encrypt } from "../../quickbooks/crypto"
import { INTEGRATIONS } from "../definitions"
import { resolveIntegration, settingsKey } from "../store"

const sealed = (v: Record<string, unknown>) => encrypt(JSON.stringify(v), settingsKey())

describe("integration settings", () => {
  it("prefers saved values, then the environment, then defaults", () => {
    const env = { KLICKPAY_CLIENT_ID: "env-id", KLICKPAY_CLIENT_SECRET: "env-secret" }
    const fromEnv = resolveIntegration("klickpay", null, env)
    expect(fromEnv).toMatchObject({ active: true, enabled: true })
    expect(fromEnv.values).toMatchObject({ client_id: "env-id", methods: ["knet", "card", "apple_pay"] })

    const saved = resolveIntegration(
      "klickpay",
      { enabled: true, config: { client_id: "admin-id", methods: ["knet"] }, secrets: sealed({ client_secret: "s" }) },
      env
    )
    expect(saved.values).toMatchObject({ client_id: "admin-id", client_secret: "s", methods: ["knet"] })
  })

  it("is inactive when switched off or missing a required key", () => {
    const env = { KLICKPAY_CLIENT_ID: "id", KLICKPAY_CLIENT_SECRET: "secret" }
    expect(resolveIntegration("klickpay", { enabled: false, config: {}, secrets: null }, env).active).toBe(false)
    const incomplete = resolveIntegration("taly", { enabled: true, config: { username: "u" }, secrets: null }, {})
    expect(incomplete).toMatchObject({ active: false, enabled: true, missing: ["password"] })
    // Never configured and nothing in the environment: off.
    expect(resolveIntegration("clarity", null, {}).active).toBe(false)
  })

  it("keeps secrets out of plain config and public fields to public IDs", () => {
    for (const def of INTEGRATIONS) {
      for (const f of def.fields) {
        expect(f.type === "secret" && !!f.public).toBe(false)
      }
    }
    const publicKeys = INTEGRATIONS.flatMap((d) => d.fields.filter((f) => f.public).map((f) => `${d.key}.${f.key}`))
    expect(publicKeys.sort()).toEqual(
      ["adsense.client", "clarity.project_id", "deema.widget_key", "deema.widget_url", "google_merchant.site_verification"].sort()
    )
  })
})
