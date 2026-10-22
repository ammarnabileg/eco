import { Metadata } from "next"
import { notFound } from "next/navigation"

import { ContentPage, FaqItem, getContentPage } from "@lib/data/content"
import RichText from "@modules/content/components/rich-text"
import { parseRichText, sectionsOf } from "@modules/content/lib/rich-text"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

type Props = { params: Promise<{ countryCode: string }> }

const updated = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ar-KW", { year: "numeric", month: "long", day: "numeric", numberingSystem: "latn" }) : null

function Hero({ page }: { page: ContentPage }) {
  // Desktop banner; on phones the title is already in the app bar.
  return (
    <section className="hidden small:block bg-[linear-gradient(160deg,#0A2A31_0%,#0B333B_46%,#0E4652_100%)] text-white">
      <div className="content-container py-8 small:py-12">
        <nav aria-label="مسار الصفحة" className="text-[12.5px] text-[#B9D3D8]">
          <ol className="flex items-center gap-2">
            <li>
              <LocalizedClientLink href="/" className="hover:text-white">
                الرئيسية
              </LocalizedClientLink>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-white">
              {page.title_ar}
            </li>
          </ol>
        </nav>
        <h1 className="mt-3 text-[26px] small:text-[36px] font-extrabold leading-tight">{page.title_ar}</h1>
        {page.summary_ar && <p className="mt-3 max-w-2xl text-[14px] small:text-[15.5px] leading-7 text-[#B9D3D8]">{page.summary_ar}</p>}
      </div>
    </section>
  )
}

function Faq({ items }: { items: FaqItem[] }) {
  const groups = new Map<string, FaqItem[]>()
  for (const it of items) {
    const g = it.group_ar?.trim() || "أسئلة عامة"
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
                  <span className="flex-1">{it.q_ar}</span>
                  <Icon name="chevr" size={18} className="shrink-0 text-laly-teal rotate-90 transition-transform group-open:-rotate-90 motion-reduce:transition-none" />
                </summary>
                <div className="px-4 pb-4 -mt-1">
                  <RichText blocks={parseRichText(it.a_ar)} />
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
    const page = await getContentPage(slug)
    if (!page) return { title: "الصفحة غير موجودة", robots: { index: false } }
    return {
      title: page.title_ar,
      description: page.summary_ar ?? undefined,
      alternates: { canonical: `/${countryCode}/${slug}` },
      openGraph: { title: page.title_ar, description: page.summary_ar ?? undefined, type: "article" },
    }
  }
}

/** An information or policy page written in the admin; 404 until it is published there. */
export function contentPageRoute(slug: string) {
  return async function ContentPageRoute() {
    const page = await getContentPage(slug)
    if (!page) notFound()
    const blocks = parseRichText(page.body_ar)
    const sections = sectionsOf(blocks)
    const faq = (page.faq ?? []).filter((f) => f.q_ar && f.a_ar)
    const date = updated(page.published_at)
    const jsonLd = faq.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q_ar, acceptedAnswer: { "@type": "Answer", text: f.a_ar } })),
        }
      : null

    return (
      <>
        <Hero page={page} />
        <div className="content-container !px-3.5 small:!px-6 py-4 small:py-12">
          {page.summary_ar && <p className="small:hidden mb-4 text-[14px] leading-7 text-laly-mut">{page.summary_ar}</p>}
          <div className={`grid gap-4 small:gap-8 ${sections.length >= 3 ? "small:grid-cols-[240px_minmax(0,1fr)]" : ""} items-start`}>
            {sections.length >= 3 && (
              <>
                <aside className="hidden small:block sticky top-28">
                  <p className="mb-3 text-xs font-bold text-laly-mut">محتويات الصفحة</p>
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
                    <span className="flex-1">محتويات الصفحة</span>
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
              {faq.length > 0 && <Faq items={faq} />}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-laly-teal-faint border border-laly-line p-5">
                <div>
                  <p className="font-bold text-laly-ink">عندك سؤال مش موجود هنا؟</p>
                  <p className="text-[13.5px] text-laly-mut">فريقنا بيرد عليك ويساعدك.</p>
                </div>
                <LocalizedClientLink
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-btn bg-laly-sand hover:bg-laly-sand-d text-[#26200D] font-bold text-sm px-5 py-3 transition-colors"
                >
                  تواصل معنا
                </LocalizedClientLink>
              </div>
              {date && (
                <p className="text-[12.5px] text-laly-mut">
                  آخر تحديث: {date} · نسخة {page.version}
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
