import { getLocale } from "@i18n/server"
import type { TrustBadge } from "@lib/data/content"
import { localize } from "@lib/util/localize"
import Icon, { isIconName } from "@modules/laly/components/icon"

export default async function TrustStrip({ badges }: { badges: TrustBadge[] }) {
  if (!badges.length) {
    return null
  }
  const locale = await getLocale()

  return (
    <section className="content-container small:-mt-14 relative z-10 mt-4">
      <ul
        className="flex small:grid gap-2 small:gap-0 overflow-x-auto no-scrollbar small:bg-white small:border small:border-laly-line small:rounded-card small:shadow-laly"
        style={{ gridTemplateColumns: `repeat(${badges.length}, minmax(0, 1fr))` }}
      >
        {badges.map((badge, i) => (
          <li
            key={badge.id}
            className={`shrink-0 flex items-center gap-2 small:gap-3 rounded-full small:rounded-none bg-white small:bg-transparent border small:border-0 border-laly-line px-3 py-2 small:px-5 small:py-5 ${
              i > 0 ? "small:border-s small:border-laly-line" : ""
            }`}
          >
            <span className="small:w-11 small:h-11 small:rounded-[13px] small:bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
              <Icon name={isIconName(badge.icon) ? badge.icon : "check"} size={20} />
            </span>
            <span>
              <span className="block text-xs small:text-[13.5px] font-extrabold whitespace-nowrap">
                {localize(badge, "title", locale)}
              </span>
              <span className="hidden small:block text-xs text-laly-mut">
                {localize(badge, "subtitle", locale)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
