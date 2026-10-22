import { Metadata } from "next"

import { listCategories } from "@lib/data/categories"
import { nonEmptyCategories } from "@lib/util/categories"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import PageBanner from "@modules/laly/components/page-banner"
import { CATEGORY_ICONS } from "@modules/laly/lib/content"

export const metadata: Metadata = {
  title: "الأقسام",
  description: "كل أقسام Laly: كاميرات المراقبة، الشبكات والواي فاي، البيت الذكي، التخزين، الكمبيوتر وبرامج الحماية.",
}

// Every product under a category, sub-categories included, counted once.
function countProducts(category: HttpTypes.StoreProductCategory, all: HttpTypes.StoreProductCategory[]) {
  const ids = new Set<string>()
  const walk = (c: HttpTypes.StoreProductCategory) => {
    for (const p of c.products ?? []) ids.add(p.id)
    for (const child of all.filter((x) => x.parent_category_id === c.id)) walk(child)
  }
  walk(category)
  return ids.size
}

export default async function CategoriesPage() {
  const all = await listCategories().catch(() => [])
  const live = nonEmptyCategories(all)
  const top = live.filter((c) => !c.parent_category_id)
  const childrenOf = (id: string) => live.filter((c) => c.parent_category_id === id)

  return (
    <>
      <PageBanner title="الأقسام" intro="اختار القسم اللي محتاجه، أو تصفّح كل المنتجات مرة واحدة." />
      <div className="content-container !px-3.5 small:!px-6 py-4 small:py-12">
        <ul className="grid grid-cols-1 gap-3 small:gap-5 small:grid-cols-2 medium:grid-cols-3">
          {top.map((c) => {
            const children = childrenOf(c.id)
            const count = countProducts(c, all)
            return (
              <li key={c.id} className="min-w-0 bg-white border border-laly-line rounded-card p-4 small:p-5 flex flex-col gap-4 hover:border-laly-teal transition-colors">
                <LocalizedClientLink href={`/categories/${c.handle}`} className="flex items-center gap-3.5 group">
                  <span className="w-12 h-12 small:w-14 small:h-14 rounded-[14px] bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
                    <Icon name={CATEGORY_ICONS[c.handle] ?? "grid"} size={26} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-extrabold text-[16px] small:text-lg text-laly-ink group-hover:text-laly-teal">{c.name}</span>
                    <span className="block text-[12.5px] text-laly-mut">{count} منتج</span>
                  </span>
                  <Icon name="chevr" size={18} className="text-laly-mut rtl:-scale-x-100" />
                </LocalizedClientLink>
                {children.length > 0 && (
                  <ul className="-mx-4 px-4 small:mx-0 small:px-0 flex gap-2 overflow-x-auto no-scrollbar small:flex-wrap" aria-label={`أقسام ${c.name}`}>
                    {children.map((child) => (
                      <li key={child.id}>
                        <LocalizedClientLink
                          href={`/categories/${child.handle}`}
                          className="h-8 px-3 shrink-0 whitespace-nowrap flex items-center rounded-full bg-laly-bg border border-laly-line text-[12.5px] font-bold text-laly-ink hover:border-laly-teal hover:text-laly-teal transition-colors"
                        >
                          {child.name}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
          <li>
            <LocalizedClientLink
              href="/store"
              className="h-full min-h-[84px] flex items-center justify-center gap-2 rounded-card border-2 border-dashed border-laly-line text-laly-teal font-extrabold hover:border-laly-teal transition-colors"
            >
              <Icon name="grid" size={20} />
              تصفّح كل المنتجات
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </>
  )
}
