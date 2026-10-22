import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { notifyStaff, StaffRequestKind } from "../workflows/after-sales/notify-staff"

const KINDS: Record<string, StaffRequestKind> = {
  "install_request.created": "install",
  "quote_request.created": "quote",
  "after_sales_request.created": "after_sales",
}

// Tells staff on the store's WhatsApp number about a new customer request.
// The customer's request is already saved: a failure here is only logged.
export default async function staffRequestWhatsapp({ event, container }: SubscriberArgs<{ id: string }>) {
  try {
    const kind = KINDS[event.name]
    if (kind) await notifyStaff(container, kind, event.data.id)
  } catch (error) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(`WhatsApp staff note for ${event.name} ${event.data.id} failed: ${(error as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: Object.keys(KINDS),
}
