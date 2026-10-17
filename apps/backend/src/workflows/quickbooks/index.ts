import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { QUICKBOOKS_MODULE } from "../../modules/quickbooks"
import { exchangeCode, QboClient, revokeToken } from "../../modules/quickbooks/client"
import { decrypt } from "../../modules/quickbooks/crypto"
import QuickBooksModuleService from "../../modules/quickbooks/service"
import { encryptionKey, storeTokens } from "./qbo"
import { syncOrderToQuickBooks, syncProductToQuickBooks, syncRefundsToQuickBooks } from "./sync"

const resolveService = (container: MedusaContainer) => container.resolve<QuickBooksModuleService>(QUICKBOOKS_MODULE)

// --- connection -----------------------------------------------------------

type Account = { Id: string; Name: string; AccountType: string }

// Sensible defaults the admin can change: product sales income, and
// Undeposited Funds for gateway payments that settle later.
async function defaultAccounts(client: QboClient) {
  const income = await client.query<Account>("Account", "AccountType = 'Income' and Active = true")
  const assets = await client.query<Account>("Account", "AccountType = 'Other Current Asset' and Active = true")
  return {
    income_account_id:
      (income.find((a) => /sales of product/i.test(a.Name)) ?? income.find((a) => /sales/i.test(a.Name)) ?? income[0])?.Id ?? null,
    deposit_account_id: assets.find((a) => /undeposited/i.test(a.Name))?.Id ?? null,
  }
}

const saveQuickbooksConnectionStep = createStep(
  "save-quickbooks-connection",
  async (input: { code: string; realm_id: string }, { container }) => {
    const svc = resolveService(container)
    const options = await svc.getOptions()
    if (!options.clientId || !options.clientSecret || !options.redirectUri) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "QuickBooks is not configured on the server")
    }
    await encryptionKey(container)
    const tokens = await exchangeCode(options.clientId, options.clientSecret, input.code, options.redirectUri)
    const environment = options.environment ?? "sandbox"
    const client = new QboClient(environment, input.realm_id, tokens.access_token)
    const [company, accounts] = await Promise.all([client.companyName().catch(() => null), defaultAccounts(client)])

    const previous = await svc.getConnection()
    // Another company's records would point at the wrong books.
    if (previous && previous.realm_id !== input.realm_id) {
      const records = await svc.listQbSyncRecords({}, { select: ["id"] })
      await svc.deleteQbSyncRecords(records.map((r) => r.id))
    }
    const base = {
      realm_id: input.realm_id,
      environment,
      company_name: company,
      ...accounts,
      shipping_item_id: null,
      refund_item_id: null,
    }
    const row = previous
      ? await svc.updateQbConnections({ ...base, id: previous.id })
      : await svc.createQbConnections({
          ...base,
          access_token: "pending",
          refresh_token: "pending",
          access_expires_at: new Date(0),
        })
    await storeTokens(container, row.id, tokens)
    return new StepResponse({ id: row.id, company_name: company, realm_id: input.realm_id })
  }
)

export const connectQuickbooksWorkflow = createWorkflow(
  "connect-quickbooks",
  (input: { code: string; realm_id: string }) => new WorkflowResponse(saveQuickbooksConnectionStep(input))
)

const removeQuickbooksConnectionStep = createStep("remove-quickbooks-connection", async (_: void, { container }) => {
  const svc = resolveService(container)
  const options = await svc.getOptions()
  const connection = await svc.getConnection()
  if (!connection) {
    return new StepResponse(false)
  }
  try {
    const key = await encryptionKey(container)
    await revokeToken(options.clientId!, options.clientSecret!, decrypt(connection.refresh_token, key))
  } catch {
    // Revoking is best effort; the tokens are deleted either way.
  }
  await svc.deleteQbConnections([connection.id])
  return new StepResponse(true)
})

export const disconnectQuickbooksWorkflow = createWorkflow(
  "disconnect-quickbooks",
  () => new WorkflowResponse(removeQuickbooksConnectionStep())
)

export type QuickBooksSettingsInput = {
  income_account_id?: string | null
  deposit_account_id?: string | null
  currency?: string | null
}

const saveQuickbooksSettingsStep = createStep(
  "save-quickbooks-settings",
  async (input: QuickBooksSettingsInput, { container }) => {
    const svc = resolveService(container)
    const connection = await svc.getConnection()
    if (!connection) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "QuickBooks is not connected")
    }
    const previous = {
      id: connection.id,
      income_account_id: connection.income_account_id,
      deposit_account_id: connection.deposit_account_id,
      currency: connection.currency,
    }
    await svc.updateQbConnections({ id: connection.id, ...input, currency: input.currency ?? connection.currency })
    return new StepResponse(input, previous)
  },
  async (previous, { container }) => {
    if (previous) {
      await resolveService(container).updateQbConnections(previous)
    }
  }
)

export const updateQuickbooksSettingsWorkflow = createWorkflow(
  "update-quickbooks-settings",
  (input: QuickBooksSettingsInput) => new WorkflowResponse(saveQuickbooksSettingsStep(input))
)

// --- sync -----------------------------------------------------------------
// QuickBooks writes cannot be rolled back, so these steps have no
// compensation; each create carries a request id instead, which makes a
// retried step safe.

const pushOrderToQuickbooksStep = createStep("push-order-to-quickbooks", async (orderId: string, { container }) => {
  return new StepResponse(await syncOrderToQuickBooks(container, orderId))
})

export const syncOrderToQuickbooksWorkflow = createWorkflow(
  "sync-order-to-quickbooks",
  (orderId: string) => new WorkflowResponse(pushOrderToQuickbooksStep(orderId))
)

const pushProductToQuickbooksStep = createStep("push-product-to-quickbooks", async (productId: string, { container }) => {
  return new StepResponse(await syncProductToQuickBooks(container, productId))
})

export const syncProductToQuickbooksWorkflow = createWorkflow(
  "sync-product-to-quickbooks",
  (productId: string) => new WorkflowResponse(pushProductToQuickbooksStep(productId))
)

const pushRefundsToQuickbooksStep = createStep("push-refunds-to-quickbooks", async (paymentId: string, { container }) => {
  return new StepResponse(await syncRefundsToQuickBooks(container, paymentId))
})

export const syncRefundsToQuickbooksWorkflow = createWorkflow(
  "sync-refunds-to-quickbooks",
  (paymentId: string) => new WorkflowResponse(pushRefundsToQuickbooksStep(paymentId))
)
