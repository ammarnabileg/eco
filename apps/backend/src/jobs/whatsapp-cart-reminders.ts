import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { remindAbandonedCarts } from "../workflows/whatsapp/rich"

// Abandoned-cart WhatsApp reminders (off unless switched on in the admin).
export default async function whatsappCartReminders(container: MedusaContainer) {
  const sent = await remindAbandonedCarts(container)
  if (sent) container.resolve(ContainerRegistrationKeys.LOGGER).info(`WhatsApp cart reminders sent: ${sent}`)
}

export const config = {
  name: "whatsapp-cart-reminders",
  schedule: "*/30 * * * *",
}
