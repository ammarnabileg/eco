import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  syncOrderToQuickbooksWorkflow,
  syncProductToQuickbooksWorkflow,
  syncRefundsToQuickbooksWorkflow,
} from "../workflows/quickbooks"

// Pushes store changes to QuickBooks when it is connected. Failures are
// recorded per record and retried by the quickbooks-retry job, so an
// accounting outage never blocks a sale.
export default async function quickbooksSync({ event, container }: SubscriberArgs<{ id: string; product_id?: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    switch (event.name) {
      case "order.placed":
        await syncOrderToQuickbooksWorkflow(container).run({ input: event.data.id })
        break
      case "payment.refunded":
        await syncRefundsToQuickbooksWorkflow(container).run({ input: event.data.id })
        break
      case "product.created":
      case "product.updated":
        await syncProductToQuickbooksWorkflow(container).run({ input: event.data.id })
        break
      case "product-variant.created":
      case "product-variant.updated":
        if (event.data.product_id) {
          await syncProductToQuickbooksWorkflow(container).run({ input: event.data.product_id })
        }
        break
    }
  } catch (error) {
    logger.warn(`QuickBooks sync for ${event.name} ${event.data.id} failed: ${(error as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "payment.refunded",
    "product.created",
    "product.updated",
    "product-variant.created",
    "product-variant.updated",
  ],
}
