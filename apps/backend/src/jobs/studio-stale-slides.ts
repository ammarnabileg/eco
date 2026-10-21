import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { stopStaleSlides } from "../workflows/studio"

// Switches off homepage slides made in the studio whose price is no longer
// the product's price (see stopStaleSlides).
export default async function studioStaleSlides(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const stopped = await stopStaleSlides(container)
  if (stopped.length) logger.warn(`Studio: switched off ${stopped.length} slide(s) whose price changed: ${stopped.join(", ")}`)
}

export const config = {
  name: "studio-stale-slides",
  schedule: "17 * * * *",
}
