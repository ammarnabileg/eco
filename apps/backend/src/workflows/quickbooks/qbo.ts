import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { QUICKBOOKS_MODULE } from "../../modules/quickbooks"
import { QboClient, QboError, qboString, refreshTokens } from "../../modules/quickbooks/client"
import { decrypt, encrypt } from "../../modules/quickbooks/crypto"
import QuickBooksModuleService from "../../modules/quickbooks/service"

type Connection = NonNullable<Awaited<ReturnType<QuickBooksModuleService["getConnection"]>>>

export type QboContext = {
  client: QboClient
  connection: Connection
  service: QuickBooksModuleService
}

const service = (container: MedusaContainer) => container.resolve<QuickBooksModuleService>(QUICKBOOKS_MODULE)

export async function encryptionKey(container: MedusaContainer) {
  const options = await service(container).getOptions()
  const key = options.encryptionKey
  if (!key) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Set QUICKBOOKS_ENCRYPTION_KEY")
  }
  return key
}

/** Saves a token set, encrypted. The refresh token Intuit returns replaces the old one. */
export async function storeTokens(
  container: MedusaContainer,
  id: string,
  tokens: { access_token: string; refresh_token: string; expires_in: number; x_refresh_token_expires_in?: number }
) {
  const key = await encryptionKey(container)
  const now = Date.now()
  await service(container).updateQbConnections({
    id,
    access_token: encrypt(tokens.access_token, key),
    refresh_token: encrypt(tokens.refresh_token, key),
    access_expires_at: new Date(now + tokens.expires_in * 1000),
    refresh_expires_at: tokens.x_refresh_token_expires_in
      ? new Date(now + tokens.x_refresh_token_expires_in * 1000)
      : null,
  })
}

// One refresh at a time across all server instances: Intuit rotates the
// refresh token, so two parallel refreshes would leave one instance with a
// dead token.
async function freshAccessToken(container: MedusaContainer, force: boolean): Promise<Connection> {
  const svc = service(container)
  const options = await svc.getOptions()
  const expiringSoon = (c: Connection) => new Date(c.access_expires_at).getTime() - 120_000 < Date.now()
  let connection = await svc.getConnection()
  if (!connection) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "QuickBooks is not connected")
  }
  if (!force && !expiringSoon(connection)) {
    return connection
  }
  const locking = container.resolve(Modules.LOCKING)
  await locking.execute("quickbooks:token-refresh", async () => {
    connection = (await svc.getConnection())!
    if (!force && !expiringSoon(connection)) {
      return
    }
    const key = await encryptionKey(container)
    const tokens = await refreshTokens(options.clientId!, options.clientSecret!, decrypt(connection.refresh_token, key))
    await storeTokens(container, connection.id, tokens)
  }, { timeout: 30 })
  return (await svc.getConnection())!
}

/**
 * Runs `fn` with an authenticated client, or returns null when QuickBooks is
 * not connected (syncing is optional). A rejected token is refreshed once.
 */
export async function withQuickBooks<T>(
  container: MedusaContainer,
  fn: (ctx: QboContext) => Promise<T>
): Promise<T | null> {
  const svc = service(container)
  const options = await svc.getOptions()
  if (!options.clientId || !(await svc.getConnection())) {
    return null
  }
  const key = await encryptionKey(container)
  for (const force of [false, true]) {
    const connection = await freshAccessToken(container, force)
    const client = new QboClient(connection.environment, connection.realm_id, decrypt(connection.access_token, key))
    try {
      return await fn({ client, connection, service: svc })
    } catch (error) {
      if (!force && error instanceof QboError && error.status === 401) {
        continue
      }
      throw error
    }
  }
  return null
}

// --- sync bookkeeping ----------------------------------------------------

/**
 * Runs one record's sync at a time: an event and the retry job (or two
 * events) reaching the same order would otherwise both create it.
 */
export async function exclusive<T>(container: MedusaContainer, key: string, fn: () => Promise<T>): Promise<T> {
  return container.resolve(Modules.LOCKING).execute(`quickbooks:${key}`, fn, { timeout: 60 })
}

type Entity = "order" | "variant" | "customer" | "refund" | "payment_method" | "capture"

export async function recordSynced(
  ctx: QboContext,
  entity: Entity,
  localId: string,
  qb: { type: string; id: string; syncToken?: string }
) {
  const existing = await ctx.service.findRecord(entity, localId)
  const data = {
    entity,
    local_id: localId,
    qb_type: qb.type,
    qb_id: qb.id,
    qb_sync_token: qb.syncToken ?? null,
    status: "synced" as const,
    error: null,
    synced_at: new Date(),
  }
  if (existing) {
    await ctx.service.updateQbSyncRecords({ ...data, id: existing.id, attempts: existing.attempts + 1 })
    return
  }
  try {
    await ctx.service.createQbSyncRecords({ ...data, attempts: 1 })
  } catch (error) {
    // Recorded concurrently by another order sharing this customer or item.
    const again = await ctx.service.findRecord(entity, localId)
    if (!again) throw error
    await ctx.service.updateQbSyncRecords({ ...data, id: again.id, attempts: again.attempts + 1 })
  }
}

export async function recordFailed(container: MedusaContainer, entity: Entity, localId: string, error: unknown) {
  const svc = service(container)
  const existing = await svc.findRecord(entity, localId)
  const message = (error as Error)?.message ?? String(error)
  if (existing) {
    // A synced record keeps its QuickBooks id; only the error is noted.
    await svc.updateQbSyncRecords({
      id: existing.id,
      status: existing.status === "synced" && existing.qb_id ? "synced" : "failed",
      error: message.slice(0, 2000),
      attempts: existing.attempts + 1,
    })
  } else {
    await svc.createQbSyncRecords({ entity, local_id: localId, status: "failed", error: message.slice(0, 2000), attempts: 1 })
  }
  container.resolve(ContainerRegistrationKeys.LOGGER).warn(`QuickBooks ${entity} ${localId}: ${message}`)
}

/** Finds an entity by name, or creates it; QuickBooks names are unique. */
export async function findOrCreateByName(
  ctx: QboContext,
  entity: string,
  field: string,
  name: string,
  payload: Record<string, unknown>,
  requestId: string
): Promise<{ Id: string; SyncToken?: string }> {
  const [found] = await ctx.client.query<{ Id: string; SyncToken?: string }>(entity, `${field} = ${qboString(name)}`)
  if (found) {
    return found
  }
  try {
    return (await ctx.client.create(entity, payload, requestId)) as { Id: string; SyncToken?: string }
  } catch (error) {
    // Created concurrently (or inactive and hidden from the query above).
    if (error instanceof QboError && error.code === "6240") {
      const [again] = await ctx.client.query<{ Id: string }>(entity, `${field} = ${qboString(name)}`)
      if (again) return again
    }
    throw error
  }
}
