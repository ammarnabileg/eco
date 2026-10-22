import { Metadata } from "next"
import { notFound } from "next/navigation"

import { intlLocale, type Locale } from "@i18n/config"
import { getLocale, getT, languageAlternates } from "@i18n/server"
import type { Translate } from "@i18n/translate"
import { ContentPage, FaqItem, getContentPage } from "@lib/data/content"
import { localize } from "@lib/util/localize"
import RichText from "@modules/content/components/rich-text"
import { parseRichText, sectionsOf } from "@modules/content/lib/rich-text"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import PageBanner from "@modules/laly/components/page-banner"

type Props = { params: Promise<{ countryCode: string }> }

const updated = (iso: string | null, locale: Locale) =>
  iso ? new Date(iso).toLocaleDateString(intlLocale(locale), { year: "numeric", month: "long", day: "numeric", numberingSystem: "latn" }) : null

function Hero({ page, locale }: { page: ContentPage; locale: Locale }) {
  return <PageBanner title={localize(page, "title", locale)} intro={localize(page, "summary", locale) || null} />
}

function Faq({ items, locale, t }: { items: FaqItem[]; locale: Locale; t: Translate }) {
  const groups = new Map<string, FaqItem[]>()
  for (const it of items) {
    const g = localize(it, "group", locale).trim() || t("pages.faq_general")
    groups.set(g, [...(groups.get(g) ?? []), it])
  }
  return (
    <div className="grid gap-8">
      {Array.from(groups.entries()).map(([group, list], gi) => (
        <section key={group} aria-labelledby={`faq-${gi}`}>
          <h2 id={`faq-${gi}`} className="mb-3 text-lg font-extrabold text-laly-ink">
            {group}
          </h2>
          <div className="grid gap-2.5">
            {list.map((it, i) => (
              <details key={i} className="group bg-white border border-laly-line rounded-card open:border-laly-teal transition-colors">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-bold text-laly-ink [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{localize(it, "q", locale)}</span>
                  <Icon name="chevr" size={18} className="shrink-0 text-laly-teal rotate-90 transition-transform group-open:-rotate-90 motion-reduce:transition-none" />
                </summary>
                <div className="px-4 pb-4 -mt-1">
                  <RichText blocks={parseRichText(localize(it, "a", locale))} />
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function contentPageMetadata(slug: string) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { countryCode } = await params
    const [page, t, locale] = await Promise.all([getContentPage(slug), getT(), getLocale()])
    if (!page) return { title: t("pages.page_not_found"), robots: { index: false } }
    const title = localize(page, "title", locale)
    const description = localize(page, "summary", locale) || undefined
    return {
      title,
      description,
      alternates: await languageAlternates(countryCode),
      openGraph: { title, description, type: "article" },
    }
  }
}

/** An information or policy page written in the admin; 404 until it is published there. */
export function contentPageRoute(slug: string) {
  return async function ContentPageRoute() {
    const [page, t, locale] = await Promise.all([getContentPage(slug), getT(), getLocale()])
    if (!page) notFound()
    const blocks = parseRichText(localize(page, "body", locale))
    const sections = sectionsOf(blocks)
    const faq = (page.faq ?? []).filter((f) => f.q_ar && f.a_ar)
    const date = updated(page.published_at, locale)
    const jsonLd = faq.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: localize(f, "q", locale),
            acceptedAnswer: { "@type": "Answer", text: localize(f, "a", locale) },
          })),
        }
      : null

    return (
      <>
        <Hero page={page} locale={locale} />
        <div className="content-container !px-3.5 small:!px-6 py-4 small:py-12">
          <div className={`grid gap-4 small:gap-8 ${sections.length >= 3 ? "small:grid-cols-[240px_minmax(0,1fr)]" : ""} items-start`}>
            {sections.length >= 3 && (
              <>
                <aside className="hidden small:block sticky top-28">
                  <p className="mb-3 text-xs font-bold text-laly-mut">{t("pages.contents")}</p>
                  <ol className="grid gap-1 border-s-2 border-laly-line text-[13.5px]">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <a href={`#${s.id}`} className="-ms-[2px] block border-s-2 border-transparent ps-3 py-1 hover:border-laly-teal hover:text-laly-teal">
                          {s.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </aside>
                <details className="small:hidden bg-white border border-laly-line rounded-card">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-bold text-laly-ink [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{t("pages.contents")}</span>
                    <Icon name="chevr" size={18} className="shrink-0 text-laly-teal rotate-90" />
                  </summary>
                  <ol className="grid gap-1 px-4 pb-4 text-[14px]">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <a href={`#${s.id}`} className="block py-1.5 text-laly-teal">
                          {s.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
              </>
            )}
            <div className="min-w-0 max-w-3xl grid gap-4 small:gap-8">
              {blocks.length > 0 && (
                <article className="bg-white border border-laly-line rounded-card shadow-laly p-4 small:p-8">
                  <RichText blocks={blocks} />
                </article>
              )}
              {faq.length > 0 && <Faq items={faq} locale={locale} t={t} />}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-laly-teal-faint border border-laly-line p-5">
                <div>
                  <p className="font-bold text-laly-ink">{t("pages.question_cta_title")}</p>
                  <p className="text-[13.5px] text-laly-mut">{t("pages.question_cta_text")}</p>
                </div>
                <LocalizedClientLink
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-btn bg-laly-sand hover:bg-laly-sand-d text-[#26200D] font-bold text-sm px-5 py-3 transition-colors"
                >
                  {t("pages.contact_title")}
                </LocalizedClientLink>
              </div>
              {date && (
                <p className="text-[12.5px] text-laly-mut">
                  {t("pages.last_updated", { date, version: page.version })}
                </p>
              )}
            </div>
          </div>
        </div>
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      </>
    )
  }
}
