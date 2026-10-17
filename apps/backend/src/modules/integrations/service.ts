import { MedusaError, MedusaService } from "@medusajs/framework/utils"

import { encrypt } from "../quickbooks/crypto"
import { INTEGRATIONS, integrationDefinition, IntegrationValues, missingFields, resolveValues } from "./definitions"
import { clearIntegrationCache, openSecrets, resolveIntegration, settingsKey } from "./store"
import IntegrationSetting from "./models/integration-setting"

export type IntegrationInput = {
  enabled?: boolean
  /** Field values. A secret left empty keeps the saved one; null removes it. */
  values?: Record<string, string | string[] | null>
}

type Row = { id: string; key: string; enabled: boolean; config: unknown; secrets: string | null }

class IntegrationsModuleService extends MedusaService({ IntegrationSetting }) {
  async findRow(key: string): Promise<Row | null> {
    const [row] = await this.listIntegrationSettings({ key }, { take: 1 })
    return (row as unknown as Row) ?? null
  }

  /** Every integration with its fields; secrets only say whether they are set. */
  async listForAdmin() {
    const rows = await this.listIntegrationSettings({}, { take: 100 })
    return INTEGRATIONS.map((def) => {
      const row = (rows.find((r) => r.key === def.key) as unknown as Row) ?? null
      const resolved = resolveIntegration(def.key, row)
      const saved = { ...((row?.config as IntegrationValues) ?? {}), ...openSecrets(row?.secrets) }
      return {
        key: def.key,
        name: def.name,
        group: def.group,
        description: def.description,
        docs: def.docs ?? null,
        enabled: resolved.enabled,
        active: resolved.active,
        missing: resolved.missing,
        fields: def.fields.map((f) => {
          const savedValue = saved[f.key]
          const hasSaved = Array.isArray(savedValue) ? savedValue.length > 0 : !!savedValue
          const value = resolved.values[f.key]
          return {
            key: f.key,
            label: f.label,
            type: f.type,
            help: f.help ?? null,
            placeholder: f.placeholder ?? null,
            options: f.options ?? null,
            required: !!f.required,
            public: !!f.public,
            // Where the effective value comes from, so staff know what to edit.
            source: hasSaved ? "admin" : f.env && process.env[f.env] ? "server" : value ? "default" : null,
            has_value: !!value && (!Array.isArray(value) || value.length > 0),
            value: f.type === "secret" ? null : (value ?? null),
          }
        }),
      }
    })
  }

  /** Saves one integration; returns the previous row so a workflow can undo it. */
  async saveIntegration(key: string, input: IntegrationInput) {
    const def = integrationDefinition(key)
    if (!def) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Unknown integration ${key}`)
    }
    const row = await this.findRow(key)
    const config = { ...((row?.config as IntegrationValues) ?? {}) }
    const secrets = openSecrets(row?.secrets)
    for (const f of def.fields) {
      if (!input.values || !(f.key in input.values)) continue
      const v = input.values[f.key]
      const target = f.type === "secret" ? secrets : config
      if (v === null) {
        delete target[f.key]
      } else if (Array.isArray(v)) {
        target[f.key] = v.filter((x) => f.options?.some((o) => o.value === x))
      } else if (typeof v === "string") {
        const trimmed = v.trim()
        // An empty secret box means "keep what is saved".
        if (f.type === "secret" && !trimmed) continue
        if (f.type === "select" && trimmed && !f.options?.some((o) => o.value === trimmed)) {
          throw new MedusaError(MedusaError.Types.INVALID_DATA, `${f.label}: invalid choice`)
        }
        if (trimmed) target[f.key] = trimmed
        else delete target[f.key]
      }
    }
    const enabled = input.enabled ?? row?.enabled ?? false
    if (enabled) {
      const missing = missingFields(def, resolveValues(def, { ...config, ...secrets }))
      if (missing.length) {
        const labels = def.fields.filter((f) => missing.includes(f.key)).map((f) => f.label)
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Fill in ${labels.join(", ")} before enabling ${def.name}`)
      }
    }
    const data = {
      key,
      enabled,
      config,
      secrets: Object.keys(secrets).length ? encrypt(JSON.stringify(secrets), settingsKey()) : null,
    }
    if (row) {
      await this.updateIntegrationSettings({ id: row.id, ...data })
    } else {
      await this.createIntegrationSettings(data)
    }
    clearIntegrationCache(key)
    return row
  }

  /** Restores a row returned by saveIntegration (or removes a new one). */
  async restoreIntegration(key: string, previous: Row | null) {
    const current = await this.findRow(key)
    if (!previous) {
      if (current) await this.deleteIntegrationSettings([current.id])
    } else if (current) {
      await this.updateIntegrationSettings({
        id: current.id,
        enabled: previous.enabled,
        config: previous.config as Record<string, unknown>,
        secrets: previous.secrets,
      })
    }
    clearIntegrationCache(key)
  }

  /** Public IDs of the switched-on marketing and widget integrations. */
  async publicValues() {
    const rows = await this.listIntegrationSettings({}, { take: 100 })
    const out: Record<string, Record<string, unknown>> = {}
    for (const def of INTEGRATIONS) {
      const publicFields = def.fields.filter((f) => f.public)
      if (!publicFields.length) continue
      const row = (rows.find((r) => r.key === def.key) as unknown as Row) ?? null
      const resolved = resolveIntegration(def.key, row)
      if (!resolved.active) continue
      out[def.key] = Object.fromEntries(publicFields.map((f) => [f.key, resolved.values[f.key] ?? null]))
    }
    return out
  }
}

export default IntegrationsModuleService
