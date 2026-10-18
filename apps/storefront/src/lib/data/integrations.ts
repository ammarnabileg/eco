"use server"

import { sdk } from "@lib/config"

// Public IDs of the integrations switched on in the admin (Settings >
// Integrations). Read at runtime, so changing them needs no rebuild.
export type PublicIntegrations = {
  clarity?: { project_id: string | null }
  adsense?: { client: string | null }
  google_merchant?: { site_verification: string | null }
  deema?: { widget_key: string | null; widget_url: string | null }
  whatsapp?: { welcome: string | null; order: string | null }
}

export const getPublicIntegrations = async (): Promise<PublicIntegrations> => {
  return sdk.client
    .fetch<{ integrations: PublicIntegrations }>("/store/integrations", {
      method: "GET",
      next: { revalidate: 60, tags: ["integrations"] },
      cache: "force-cache",
    })
    .then((r) => r.integrations ?? {})
    .catch(() => ({}))
}
