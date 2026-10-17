import { lineAddons } from "@lib/util/catalog"
import { convertToLocale } from "@lib/util/money"

/** The add-ons (RAM, SSD, HDD...) chosen with a line item, under its title. */
export default function LineItemAddons({
  metadata,
  currencyCode,
}: {
  metadata: unknown
  currencyCode?: string
}) {
  const addons = lineAddons(metadata)
  if (!addons.length) {
    return null
  }

  return (
    <ul
      className="mt-1 flex flex-col gap-0.5 text-xs text-laly-mut"
      data-testid="line-item-addons"
    >
      {addons.map((a) => (
        <li key={a.option_id} className="flex flex-wrap items-baseline gap-x-1">
          <span>{a.group_ar}:</span>
          <span dir="auto" className="font-bold text-laly-ink">
            {a.name_ar}
          </span>
          {currencyCode && a.price > 0 && (
            <span className="tabular-nums">
              (+
              {convertToLocale({
                amount: a.price,
                currency_code: currencyCode,
              })}
              )
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
