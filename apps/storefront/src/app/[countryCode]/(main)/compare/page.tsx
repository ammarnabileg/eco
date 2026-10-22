import { Metadata } from "next"

import { getT } from "@i18n/server"
import PageBanner from "@modules/laly/components/page-banner"
import CompareView from "@modules/tools/components/compare-view"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("tools.nav_compare"), robots: { index: false, follow: true } }
}

export default async function ComparePage() {
  const t = await getT()
  return (
    <>
      <PageBanner title={t("tools.nav_compare")} intro={t("tools.compare_intro")} />
      <div className="content-container !px-3.5 small:!px-6 py-4 small:py-10">
        <CompareView />
      </div>
    </>
  )
}
