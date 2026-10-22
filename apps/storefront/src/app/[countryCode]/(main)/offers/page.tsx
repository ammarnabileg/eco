import { Metadata } from "next"

import { getActiveOffers, offerEndsByProduct } from "@lib/data/offers"
import { getRegion } from "@lib/data/regions"
import { getT } from "@i18n/server"
import ProductSection from "@modules/home/components/product-section"
import Countdown from "@modules/laly/components/countdown"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: t("pages.offers_title"),
    description: t("pages.offers_description"),
  }
}

export default async function OffersPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [region, offers, t] = await Promise.all([
    getRegion(countryCode),
    getActiveOffers(),
    getT(),
  ])
  if (!region) {
    return null
  }

  const offerEnds = await offerEndsByProduct(offers)

  return (
    <div className="pb-8">
      {offers.length === 0 && (
        <p className="content-container mt-14 text-center text-laly-mut">
          {t("catalog.no_offers")}
        </p>
      )}
      {offers.map((offer) => (
        <ProductSection
          key={offer.id}
          title={offer.title}
          eyebrow={offer.description ?? undefined}
          region={region}
          layout="grid"
          productIds={offer.product_ids}
          // The section shows this offer's countdown; cards only need their
          // own when a product sits in an offer that ends sooner.
          offerEnds={Object.fromEntries(
            Object.entries(offerEnds).filter(([, end]) => end !== offer.ends_at)
          )}
          limit={48}
          extra={offer.ends_at ? <Countdown endsAt={offer.ends_at} /> : undefined}
        />
      ))}
    </div>
  )
}
