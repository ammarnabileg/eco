import { getLocale, getT } from "@i18n/server"
import { categoryName } from "@lib/util/category-name"

import { nonEmptyCategories } from "@lib/util/categories"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import SectionHeading from "@modules/laly/components/section-heading"
import { CATEGORY_ICONS } from "@modules/laly/lib/content"

export default async function CategoryTiles({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) {
  const topLevel = nonEmptyCategories(categories).filter((c) => !c.parent_category)
  if (!topLevel.length) {
    return null
  }
  const [t, locale] = await Promise.all([getT(), getLocale()])

  return (
    <section className="content-container mt-10 small:mt-14">
      <SectionHeading
        eyebrow={t("home.categories_eyebrow")}
        title={t("home.categories_title")}
        href="/categories"
      />
      <ul className="flex small:grid small:grid-cols-8 gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 small:mx-0 small:px-0">
        {topLevel.map((c) => (
          <li key={c.id} className="shrink-0 w-[76px] small:w-auto">
            <LocalizedClientLink
              href={`/categories/${c.handle}`}
              className="group flex flex-col items-center gap-2 small:gap-3 small:bg-white small:border small:border-laly-line small:rounded-card small:py-5 small:px-2 hover:small:border-laly-teal transition-colors text-center"
            >
              <span className="w-[60px] h-[60px] small:w-12 small:h-12 rounded-[18px] small:rounded-[13px] bg-white small:bg-laly-teal-soft border small:border-0 border-laly-line text-laly-teal flex items-center justify-center group-hover:-translate-y-1 transition-transform">
                <Icon name={CATEGORY_ICONS[c.handle] ?? "grid"} size={24} />
              </span>
              <span className="text-[11.5px] small:text-[13px] font-bold leading-tight">
                {categoryName(c, locale)}
              </span>
            </LocalizedClientLink>
          </li>
        ))}
        <li className="hidden small:block">
          <LocalizedClientLink
            href="/categories"
            className="group flex flex-col items-center gap-3 bg-white border border-laly-line rounded-card py-5 px-2 hover:border-laly-teal transition-colors text-center"
          >
            <span className="w-12 h-12 rounded-[13px] bg-laly-teal-soft text-laly-teal flex items-center justify-center group-hover:-translate-y-1 transition-transform">
              <Icon name="grid" size={24} />
            </span>
            <span className="text-[13px] font-bold">{t("home.view_all")}</span>
          </LocalizedClientLink>
        </li>
      </ul>
    </section>
  )
}
