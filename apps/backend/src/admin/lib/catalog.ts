// Shapes returned by the /admin/catalog API, mirrored for the admin UI.

export type SpecOption = { value: string; label_ar: string; label_en: string }

export type SpecAttribute = {
  key: string
  label_ar: string
  label_en: string
  type: "text" | "number" | "boolean" | "select" | "multiselect"
  unit?: string | null
  options?: SpecOption[]
  group_ar?: string | null
  group_en?: string | null
  filterable?: boolean
  required?: boolean
}

export type FaqEntry = {
  question_ar: string
  answer_ar: string
  question_en: string
  answer_en: string
}

export type Brand = { id: string; name: string; handle: string; is_active: boolean }

export type AddonOption = {
  id?: string
  name_ar: string
  name_en: string
  price: number | string
  sku?: string | null
  is_active?: boolean
  rank?: number
}

export type AddonGroup = {
  id: string
  name_ar: string
  name_en: string
  kind: string
  selection: "single" | "multiple"
  is_required: boolean
  rank: number
  options: AddonOption[]
}

export type SpecTemplate = {
  id: string
  name_ar: string
  name_en: string
  rank: number
  attributes: SpecAttribute[]
  product_categories?: { id: string; name: string }[]
}

export type QuoteRequest = {
  id: string
  product_id: string
  product_title: string
  customer_name: string
  phone: string
  email?: string | null
  company?: string | null
  quantity: number
  message?: string | null
  status: "new" | "contacted" | "quoted" | "won" | "lost"
  admin_note?: string | null
  created_at: string
}

export const ADDON_KINDS: { value: string; label: string }[] = [
  { value: "ram", label: "رام" },
  { value: "ssd", label: "SSD" },
  { value: "hdd", label: "هارد HDD" },
  { value: "memory_card", label: "كارت ذاكرة" },
  { value: "installation", label: "تركيب" },
  { value: "warranty", label: "ضمان إضافي" },
  { value: "other", label: "أخرى" },
]

export const QUOTE_STATUSES: { value: QuoteRequest["status"]; label: string }[] = [
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "quoted", label: "تم إرسال العرض" },
  { value: "won", label: "تم البيع" },
  { value: "lost", label: "لم يتم" },
]

export type InstallRequest = {
  id: string
  customer_name: string
  phone: string
  governorate: string
  area?: string | null
  service: "cctv" | "networking" | "smart_home" | "intercom" | "other"
  preferred_date?: string | null
  message?: string | null
  product_id?: string | null
  locale: string
  status: "new" | "contacted" | "scheduled" | "done" | "cancelled"
  admin_note?: string | null
  created_at: string
}

export const INSTALL_STATUSES: { value: InstallRequest["status"]; label: string }[] = [
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "scheduled", label: "تم تحديد موعد" },
  { value: "done", label: "تم التركيب" },
  { value: "cancelled", label: "ملغي" },
]

export const INSTALL_SERVICES: Record<InstallRequest["service"], string> = {
  cctv: "كاميرات مراقبة",
  networking: "شبكات وواي فاي",
  smart_home: "بيت ذكي",
  intercom: "إنتركم وتحكم بالدخول",
  other: "أخرى",
}

export const formatKwd = (value: number | string) => `${Number(value).toFixed(3)} د.ك`

// Empty strings become null so the API clears the field.
export const orNull = (v: string | null | undefined) => {
  const t = (v ?? "").trim()
  return t ? t : null
}

export const linesToList = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
