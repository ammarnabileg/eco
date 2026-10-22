import { MedusaError } from "@medusajs/framework/utils"

// The information pages the store has. The list is fixed so links, the
// footer and the storefront routes always agree; the text is written in the
// admin and only shows once published.
export const CONTENT_PAGES = [
  { slug: "about", label: "من نحن", group: "company" },
  { slug: "faq", label: "الأسئلة الشائعة", group: "care" },
  { slug: "installation", label: "خدمة التركيب", group: "service" },
  { slug: "shipping-policy", label: "سياسة التوصيل", group: "care" },
  { slug: "return-policy", label: "سياسة الإرجاع والاستبدال", group: "care" },
  { slug: "warranty", label: "الضمان", group: "care" },
  { slug: "privacy-policy", label: "سياسة الخصوصية", group: "legal" },
  { slug: "terms", label: "الشروط والأحكام", group: "legal" },
] as const

export type ContentPageSlug = (typeof CONTENT_PAGES)[number]["slug"]
export const isContentPageSlug = (slug: string): slug is ContentPageSlug => CONTENT_PAGES.some((p) => p.slug === slug)

export const knownSlug = (slug: string) => {
  if (!isContentPageSlug(slug)) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Unknown page "${slug}"`)
  return slug
}
