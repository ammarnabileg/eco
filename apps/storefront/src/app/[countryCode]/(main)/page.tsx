import { Metadata } from "next"

import { listCategories } from "@lib/data/categories"
import { getStoreContent } from "@lib/data/content"
import { getCollectionByHandle } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import Brands from "@modules/home/components/brands"
import CategoryTiles from "@modules/home/components/category-tiles"
import Hero from "@modules/home/components/hero"
import InstallCta from "@modules/home/components/install-cta"
import ProductSection from "@modules/home/components/product-section"
import TrustStrip from "@modules/home/components/trust-strip"

export const metadata: Metadata = {
  title: { absolute: "Laly — شريكك التقني في الكويت" },
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  const region = await getRegion(countryCode)
  if (!region) {
    return null
  }

  const [content, categories, deals, bestSellers] = await Promise.all([
    getStoreContent(),
    listCategories().catch(() => []),
    getCollectionByHandle("deals").catch(() => undefined),
    getCollectionByHandle("best-sellers").catch(() => undefined),
  ])

  return (
    <div className="pb-4">
      <Hero slides={content.hero_slides} whatsapp={content.settings.whatsapp} />
      <TrustStrip badges={content.trust_badges} />
      <CategoryTiles categories={categories} />
      <ProductSection collection={deals} region={region} layout="rail" eyebrow="وفّر أكثر" />
      <ProductSection collection={bestSellers} region={region} layout="grid" eyebrow="مختارات عملائنا" />
      <InstallCta whatsapp={content.settings.whatsapp} />
      <Brands />
    </div>
  )
}
