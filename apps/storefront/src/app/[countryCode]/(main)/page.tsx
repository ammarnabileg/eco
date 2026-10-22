import { Metadata } from "next"

import { listCategories } from "@lib/data/categories"
import { getCollectionByHandle } from "@lib/data/collections"
import { getStoreContent } from "@lib/data/content"
import { getActiveOffers, offerEndsByProduct } from "@lib/data/offers"
import { getRegion } from "@lib/data/regions"
import { getT } from "@i18n/server"
import Brands from "@modules/home/components/brands"
import CategoryTiles from "@modules/home/components/category-tiles"
import ForYou from "@modules/home/components/for-you"
import Hero from "@modules/home/components/hero"
import InstallCta from "@modules/home/components/install-cta"
import ProductSection from "@modules/home/components/product-section"
import TrustStrip from "@modules/home/components/trust-strip"
import Countdown from "@modules/laly/components/countdown"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: { absolute: t("pages.home_title") } }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  const region = await getRegion(countryCode)
  if (!region) {
    return null
  }

  const [content, categories, offers, bestSellers] = await Promise.all([
    getStoreContent(),
    listCategories().catch(() => []),
    getActiveOffers(),
    getCollectionByHandle("best-sellers").catch(() => null),
  ])

  const [offerEnds, t] = await Promise.all([offerEndsByProduct(offers), getT()])
  const offerProductIds = Array.from(new Set(offers.flatMap((o) => o.product_ids)))
  const endDates = Array.from(new Set(Object.values(offerEnds))).sort()
  const soonestEnd = endDates[0]
  // One shared end date: show it once on the section, not on every card.
  const dealCardEnds = endDates.length > 1 ? offerEnds : {}

  return (
    <div className="pb-4">
      <Hero slides={content.hero_slides} whatsapp={content.settings.whatsapp} />
      <TrustStrip badges={content.trust_badges} />
      <ForYou region={region} offerEnds={offerEnds} />
      <CategoryTiles categories={categories} />
      <ProductSection
        title={offers.length === 1 ? offers[0].title : t("home.weekly_offers")}
        eyebrow={t("home.save_more")}
        region={region}
        layout="rail"
        productIds={offerProductIds}
        offerEnds={dealCardEnds}
        extra={soonestEnd ? <Countdown endsAt={soonestEnd} /> : undefined}
      />
      {bestSellers && (
        <ProductSection
          title={bestSellers.title}
          eyebrow={t("home.best_sellers_eyebrow")}
          href={`/collections/${bestSellers.handle}`}
          region={region}
          layout="grid"
          collectionId={bestSellers.id}
          offerEnds={offerEnds}
        />
      )}
      <InstallCta whatsapp={content.settings.whatsapp} />
      <Brands />
    </div>
  )
}
