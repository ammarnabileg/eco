"use server"

import { sdk } from "@lib/config"

export type Lang = "ar" | "en"

export type SiteSettings = {
  whatsapp: string | null
  phone: string | null
  email: string | null
  address_ar: string | null
  address_en: string | null
  hours_ar: string | null
  hours_en: string | null
}

export type TrustBadge = {
  id: string
  icon: string
  title_ar: string
  title_en: string
  subtitle_ar: string | null
  subtitle_en: string | null
}

export type HeroSlide = {
  id: string
  eyebrow_ar: string | null
  eyebrow_en: string | null
  title_ar: string
  title_en: string
  highlight_ar: string | null
  highlight_en: string | null
  subtitle_ar: string | null
  subtitle_en: string | null
  cta_label_ar: string | null
  cta_label_en: string | null
  cta_url: string | null
  image_url: string | null
  /** A finished image from the admin studio; when set it is the whole slide. */
  banner_url?: string | null
  banner_mobile_url?: string | null
}

export type PageLink = { slug: string; title_ar: string; title_en: string }

export type StoreContent = {
  settings: SiteSettings
  trust_badges: TrustBadge[]
  hero_slides: HeroSlide[]
  /** Published information pages (about, policies, FAQ). */
  pages?: PageLink[]
}

const EMPTY: StoreContent = {
  settings: {
    whatsapp: null,
    phone: null,
    email: null,
    address_ar: null,
    address_en: null,
    hours_ar: null,
    hours_en: null,
  },
  trust_badges: [],
  hero_slides: [],
  pages: [],
}

// Admin-managed content. Public and identical for every visitor, so it is
// cached across requests and refreshed every minute.
export const getStoreContent = async (): Promise<StoreContent> => {
  return sdk.client
    .fetch<StoreContent>("/store/content", {
      method: "GET",
      next: { revalidate: 60, tags: ["store-content"] },
      cache: "force-cache",
    })
    .catch(() => EMPTY)
}

export type FaqItem = { group_ar?: string | null; group_en?: string | null; q_ar: string; a_ar: string; q_en?: string | null; a_en?: string | null }
export type ContentPage = {
  slug: string
  version: number
  title_ar: string
  title_en: string
  summary_ar: string | null
  summary_en: string | null
  body_ar: string
  body_en: string
  faq: FaqItem[] | null
  published_at: string | null
}

// The published version of an information page, or null when it is not live.
export const getContentPage = async (slug: string): Promise<ContentPage | null> =>
  sdk.client
    .fetch<{ page: ContentPage }>(`/store/content/pages/${slug}`, {
      method: "GET",
      next: { revalidate: 60, tags: ["store-content", `page-${slug}`] },
      cache: "force-cache",
    })
    .then((r) => r.page)
    .catch(() => null)
