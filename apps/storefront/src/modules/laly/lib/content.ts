import type { IconName } from "@modules/laly/components/icon"

// Static presentation data. Contact details, trust badges, and hero slides
// are managed from the admin (Store content) and fetched via getStoreContent.

export const CATEGORY_ICONS: Record<string, IconName> = {
  cctv: "cctv",
  "security-cameras": "cctv",
  "access-control-intercom": "user",
  computers: "laptop",
  "security-software": "shield",
  networking: "router",
  "smart-home": "smarthome",
  storage: "storage",
  laptops: "laptop",
  accessories: "headphones",
  monitors: "projector",
}


export const PAYMENT_METHODS = ["KNET", "Visa", "Mastercard", "Apple Pay"]
