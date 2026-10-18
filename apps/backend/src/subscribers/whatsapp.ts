import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { sendOrderMessage, sendWelcome } from "../workflows/whatsapp"

// WhatsApp messages to customers. A gateway outage never blocks a sale: the
// failure is logged (and, for orders, shown on the order page).
export default async function whatsappMessages({ event, container }: SubscriberArgs<{ id: string }>) {
  try {
    if (event.name === "order.placed") await sendOrderMessage(container, event.data.id)
    if (event.name === "customer.created") await sendWelcome(container, event.data.id)
  } catch (error) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(`WhatsApp ${event.name} ${event.data.id} failed: ${(error as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "customer.created"],
}
