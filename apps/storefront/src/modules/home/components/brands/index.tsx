import { listBrands } from "@lib/data/catalog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SectionHeading from "@modules/laly/components/section-heading"

// The brands the store actually sells (from the catalog), each linked to its page.
export default async function Brands() {
  const brands = await listBrands()
  if (!brands.length) return null
  return (
    <section className="content-container mt-10 small:mt-14">
      <SectionHeading eyebrow="الماركات" title="تسوّق حسب الماركة" href="/brands" />
      <ul className="flex flex-wrap gap-2 small:gap-3">
        {brands.map((b) => (
          <li key={b.id}>
            <LocalizedClientLink
              href={`/brands/${b.handle}`}
              dir="ltr"
              className="block font-latin text-xs small:text-sm font-bold text-laly-ink bg-white border border-laly-line rounded-full px-4 py-2 hover:border-laly-teal hover:text-laly-teal transition-colors"
            >
              {b.name}
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
