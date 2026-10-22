import { getPublicIntegrations } from "@lib/data/integrations"
import { getBaseURL } from "@lib/util/env"
import { IntegrationsProvider } from "@modules/common/components/integrations/context"
import IntegrationScripts from "@modules/common/components/integrations/scripts"
import { Metadata } from "next"

import { LOCALES } from "@i18n/config"
import { I18nProvider } from "@i18n/client"
import { dictionariesFor, getLocale, getT, languageAlternates } from "@i18n/server"
// Fonts are bundled from npm and served from our own domain: no request to
// Google at build time or from the visitor's browser.
import "@fontsource/tajawal/400.css"
import "@fontsource/tajawal/500.css"
import "@fontsource/tajawal/700.css"
import "@fontsource/tajawal/800.css"
import "@fontsource/poppins/latin-400.css"
import "@fontsource/poppins/latin-500.css"
import "@fontsource/poppins/latin-700.css"
import "@fontsource/poppins/latin-800.css"
import "styles/globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const verification = (await getPublicIntegrations()).google_merchant?.site_verification
  const t = await getT()
  return {
    metadataBase: new URL(getBaseURL()),
    title: {
      default: t("layout.site_title"),
      template: "%s | Laly",
    },
    description: t("layout.store_description"),
    // Canonical and hreflang links for every page; pages may override.
    alternates: await languageAlternates(),
    ...(verification ? { verification: { google: verification } } : {}),
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const [integrations, locale] = await Promise.all([getPublicIntegrations(), getLocale()])
  return (
    <html lang={locale} dir={LOCALES[locale].dir} data-mode="light">
      <body className={`bg-laly-bg text-laly-ink antialiased ${locale === "ar" ? "font-sans" : "font-latin"}`}>
        <I18nProvider locale={locale} dictionaries={dictionariesFor(locale)}>
          <IntegrationsProvider value={integrations}>
            <main className="relative">{props.children}</main>
          </IntegrationsProvider>
        </I18nProvider>
        <IntegrationScripts integrations={integrations} />
      </body>
    </html>
  )
}
