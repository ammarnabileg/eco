import { MedusaError } from "@medusajs/framework/utils"

import { decrypt } from "../quickbooks/crypto"
import { integrationDefinition, IntegrationValues, missingFields, resolveValues } from "./definitions"

// Read path shared by everything that needs a service's keys at runtime:
// payment providers and QuickBooks run in their own module containers and
// cannot resolve the integrations module, but every module container holds
// the database connection. Values are cached briefly; saving clears the cache.

type Pg = {
  raw: (sql: string, bindings?: unknown[]) => Promise<{ rows?: Record<string, unknown>[] }>
}

export type ResolvedIntegration = {
  /** Switched on and every required field has a value. */
  active: boolean
  enabled: boolean
  values: IntegrationValues
  missing: string[]
}

const TTL_MS = 15_000
const cache = new Map<string, { at: number; value: ResolvedIntegration }>()

export function clearIntegrationCache(key?: string) {
  if (key) cache.delete(key)
  else cache.clear()
}

/**
 * The key that encrypts saved secrets. SETTINGS_ENCRYPTION_KEY, else the
 * QuickBooks one that the Coolify stack already generates.
 */
export function settingsKey(): string {
  const key = process.env.SETTINGS_ENCRYPTION_KEY || process.env.QUICKBOOKS_ENCRYPTION_KEY
  if (key) return key
  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Set SETTINGS_ENCRYPTION_KEY on the server before saving integration keys"
    )
  }
  return "development-settings-key"
}

export function openSecrets(sealed: unknown): IntegrationValues {
  if (typeof sealed !== "string" || !sealed) return {}
  return JSON.parse(decrypt(sealed, settingsKey())) as IntegrationValues
}

/**
 * Saved row + environment + defaults. An integration that was never saved
 * is active when its environment variables are set, so existing servers
 * keep working unchanged.
 */
export function resolveIntegration(
  key: string,
  row: { enabled: boolean; config: unknown; secrets: unknown } | null,
  env: Record<string, string | undefined> = process.env
): ResolvedIntegration {
  const def = integrationDefinition(key)
  if (!def) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Unknown integration ${key}`)
  }
  const saved = { ...((row?.config as IntegrationValues) ?? {}), ...openSecrets(row?.secrets) }
  const values = resolveValues(def, saved, env)
  const missing = missingFields(def, values)
  const enabled = row ? row.enabled : missing.length === 0 && def.fields.some((f) => f.env && env[f.env])
  return { active: enabled && missing.length === 0, enabled, values, missing }
}

export async function readIntegration(pg: Pg | undefined, key: string): Promise<ResolvedIntegration> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value
  type Row = { enabled: boolean; config: unknown; secrets: unknown }
  let row: Row | null = null
  if (pg) {
    try {
      const res = await pg.raw(
        "select enabled, config, secrets from integration_setting where key = ? and deleted_at is null limit 1",
        [key]
      )
      row = (res.rows?.[0] as Row | undefined) ?? null
    } catch {
      // Table not migrated yet: fall back to the environment.
    }
  }
  const value = resolveIntegration(key, row)
  cache.set(key, { at: Date.now(), value })
  return value
}
