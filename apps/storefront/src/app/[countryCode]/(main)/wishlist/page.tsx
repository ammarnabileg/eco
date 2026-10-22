import { Metadata } from "next"

import { getT } from "@i18n/server"
import PageBanner from "@modules/laly/components/page-banner"
import WishlistView from "@modules/tools/components/wishlist-view"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  // Personal (saved in this browser): nothing for search engines.
  return { title: t("tools.nav_wishlist"), robots: { index: false, follow: true } }
}

export default async function WishlistPage() {
  const t = await getT()
  return (
    <>
      <PageBanner title={t("tools.nav_wishlist")} intro={t("tools.wishlist_intro")} />
      <div className="content-container !px-3.5 small:!px-6 py-4 small:py-10">
        <WishlistView />
      </div>
    </>
  )
}
