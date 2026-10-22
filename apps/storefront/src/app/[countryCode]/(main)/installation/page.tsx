import { Metadata } from "next"

import { getContentPage, getStoreContent } from "@lib/data/content"
import { localize, whatsappLink } from "@lib/util/localize"
import { getLocale, getT, languageAlternates } from "@i18n/server"
import RichText from "@modules/content/components/rich-text"
import { parseRichText } from "@modules/content/lib/rich-text"
import PageBanner from "@modules/laly/components/page-banner"
import InstallForm from "@modules/services/components/install-form"

type Props = { params: Promise<{ countryCode: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode } = await params
  const [t, locale, page] = await Promise.all([getT(), getLocale(), getContentPage("installation")])
  return {
    title: (page && localize(page, "title", locale)) || t("service.title"),
    description: (page && localize(page, "summary", locale)) || t("service.description"),
    alternates: await languageAlternates(countryCode),
  }
}

// The installation service: what the store offers (written in the admin as
// the "خدمة التركيب" page, shown once published) and the booking form,
// which works with or without that text.
export default async function InstallationPage() {
  const [t, locale, page, { settings }] = await Promise.all([
    getT(),
    getLocale(),
    getContentPage("installation"),
    getStoreContent(),
  ])
  const blocks = page ? parseRichText(localize(page, "body", locale)) : []
  const whatsapp = whatsappLink(settings.whatsapp, t("service.whatsapp_message"))

  return (
    <>
      <PageBanner
        title={(page && localize(page, "title", locale)) || t("service.title")}
        intro={(page && localize(page, "summary", locale)) || t("service.intro")}
      />
      <div className="content-container !px-3.5 small:!px-6 py-4 small:py-12">
        <div className={`grid gap-6 small:gap-10 items-start ${blocks.length ? "small:grid-cols-[minmax(0,1fr)_440px]" : "max-w-xl mx-auto"}`}>
          {blocks.length > 0 && (
            <article className="bg-white border border-laly-line rounded-card p-4 small:p-8">
              <RichText blocks={blocks} />
            </article>
          )}
          <div className="grid gap-4 small:sticky small:top-28">
            <InstallForm whatsapp={whatsapp} />
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-[13.5px] font-bold text-laly-teal underline underline-offset-4"
              >
                {t("service.or_whatsapp")}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
