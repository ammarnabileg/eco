import { MedusaContainer } from "@medusajs/framework/types"

import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import QuickBooksModuleService from "../modules/quickbooks/service"

const KEEP_DAYS = 90

// QuickBooks reports every change in the company; keep 90 days of routine
// events. Flagged ones nobody reviewed are kept until reviewed.
export default async function cleanupQuickbooksEvents(container: MedusaContainer) {
  const svc = container.resolve<QuickBooksModuleService>(QUICKBOOKS_MODULE)
  const before = new Date(Date.now() - KEEP_DAYS * 24 * 3600 * 1000)
  for (;;) {
    const old = await svc.listQbWebhookEvents(
      { created_at: { $lt: before }, $or: [{ attention: false }, { reviewed_at: { $ne: null } }] },
      { take: 500, select: ["id"] }
    )
    if (!old.length) return
    await svc.deleteQbWebhookEvents(old.map((e) => e.id))
  }
}

export const config = {
  name: "quickbooks-webhook-cleanup",
  schedule: "17 3 * * *",
}
