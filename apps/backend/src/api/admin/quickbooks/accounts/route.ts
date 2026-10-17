import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { withQuickBooks } from "../../../../workflows/quickbooks/qbo"

type Account = { Id: string; Name: string; AccountType: string; CurrencyRef?: { value: string } }

// Accounts the admin can choose for sales income and for incoming payments.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const result = await withQuickBooks(req.scope, async ({ client }) => {
    const [income, deposit] = await Promise.all([
      client.query<Account>("Account", "AccountType = 'Income' and Active = true"),
      client.query<Account>("Account", "AccountType in ('Bank', 'Other Current Asset') and Active = true"),
    ])
    const view = (a: Account) => ({ id: a.Id, name: a.Name, type: a.AccountType, currency: a.CurrencyRef?.value ?? null })
    return { income: income.map(view), deposit: deposit.map(view) }
  })
  res.json(result ?? { income: [], deposit: [] })
}
