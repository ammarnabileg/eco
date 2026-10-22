import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import { getT } from "@i18n/server"

export default async function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
  extra,
}: {
  eyebrow?: string
  title: string
  href?: string
  linkLabel?: string
  extra?: React.ReactNode
}) {
  const t = await getT()
  return (
    <div className="flex items-end justify-between gap-4 mb-5 small:mb-7">
      <div>
        {eyebrow && (
          <span className="hidden small:flex items-center gap-2 text-[13px] font-bold text-laly-teal mb-1.5">
            <span className="w-5 h-[3px] rounded bg-laly-sand" />
            {eyebrow}
          </span>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl small:text-[28px] font-extrabold leading-tight">
            {title}
          </h2>
          {extra}
        </div>
      </div>
      {href && (
        <LocalizedClientLink
          href={href}
          className="flex items-center gap-1.5 text-[13px] font-bold text-laly-teal hover:text-laly-teal-d shrink-0"
        >
          {linkLabel ?? t("layout.view_all")}
          <Icon name="arrowr" size={15} className="rtl:-scale-x-100" />
        </LocalizedClientLink>
      )}
    </div>
  )
}
