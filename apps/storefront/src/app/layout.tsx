import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
// Fonts are bundled from npm and served from our own domain: no request to
// Google at build time or from the visitor's browser.
import "@fontsource/tajawal/400.css"
import "@fontsource/tajawal/500.css"
import "@fontsource/tajawal/700.css"
import "@fontsource/tajawal/800.css"
import "@fontsource/poppins/latin-700.css"
import "@fontsource/poppins/latin-800.css"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Laly — شريكك التقني في الكويت",
    template: "%s | Laly",
  },
  description:
    "متجر كويتي متخصص في أنظمة المراقبة والشبكات والبيت الذكي — منتجات أصلية بضمان، وخدمة تركيب في جميع المحافظات.",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-mode="light">
      <body className="bg-laly-bg text-laly-ink font-sans antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
