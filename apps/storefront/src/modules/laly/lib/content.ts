import type { IconName } from "@modules/laly/components/icon"

// Store-wide copy and settings. Policies here (warranty, returns, delivery)
// are shown to customers as commitments: confirm each one before launch.

export const CATEGORY_ICONS: Record<string, IconName> = {
  cctv: "cctv",
  networking: "router",
  "smart-home": "smarthome",
  storage: "storage",
  laptops: "laptop",
  accessories: "headphones",
  monitors: "projector",
}

export const TRUST_ITEMS: { icon: IconName; title: string; sub: string }[] = [
  { icon: "shield", title: "ضمان سنتين", sub: "على جميع المنتجات" },
  { icon: "ret", title: "إرجاع 30 يوم", sub: "استبدال بدون تعقيد" },
  { icon: "truck", title: "توصيل سريع", sub: "لكل محافظات الكويت" },
  { icon: "wallet", title: "دفع آمن", sub: "كي نت وبطاقات ائتمان" },
  { icon: "headset", title: "دعم فني", sub: "فنيون جاهزون لخدمتك" },
]

export const BRANDS = [
  "HIKVISION",
  "TP-Link",
  "Dahua",
  "D-Link",
  "EZVIZ",
  "Ubiquiti",
  "MikroTik",
  "Western Digital",
]

export const PAYMENT_METHODS = ["KNET", "Visa", "Mastercard", "Apple Pay"]

export const CONTACT = {
  // Set these in the environment; links are hidden while they are empty.
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  address: "حولي، شارع تونس — الكويت",
  hours: "يومياً 9 ص - 10 م",
}
