import { getContentPage } from "@lib/data/content"
import { localize } from "@lib/util/localize"
import { getLocale, getT } from "@i18n/server"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Links to the return and warranty policies, only once the owner has published them.
export default async function PolicyLinks() {
  const [t, locale, ...pages] = await Promise.all([getT(), getLocale(), getContentPage("return-policy"), getContentPage("warranty")])
  const live = pages.filter((p): p is NonNullable<typeof p> => !!p)
  if (!live.length) return null
  return (
    <div className="grid gap-2">
      <h3 className="text-[13px] font-bold text-laly-mut">{t("aftersales.policy_links")}</h3>
      <div className="flex flex-wrap gap-2">
        {live.map((p) => (
          <LocalizedClientLink
            key={p.slug}
            href={`/${p.slug}`}
            className="rounded-btn border border-laly-line bg-white px-4 py-2 text-[13.5px] font-bold text-laly-teal hover:border-laly-teal"
          >
            {localize(p, "title", locale)}
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}
