import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

export default function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel = "عرض الكل",
}: {
  eyebrow?: string
  title: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5 small:mb-7">
      <div>
        {eyebrow && (
          <span className="hidden small:flex items-center gap-2 text-[13px] font-bold text-laly-teal mb-1.5">
            <span className="w-5 h-[3px] rounded bg-laly-sand" />
            {eyebrow}
          </span>
        )}
        <h2 className="text-xl small:text-[28px] font-extrabold leading-tight">
          {title}
        </h2>
      </div>
      {href && (
        <LocalizedClientLink
          href={href}
          className="flex items-center gap-1.5 text-[13px] font-bold text-laly-teal hover:text-laly-teal-d shrink-0"
        >
          {linkLabel}
          <Icon name="arrowr" size={15} className="rtl:-scale-x-100" />
        </LocalizedClientLink>
      )}
    </div>
  )
}
