"use client"

import { intlLocale } from "@i18n/config"
import { useLocale } from "@i18n/client"
import { lineAddons } from "@lib/util/catalog"
import { localize } from "@lib/util/localize"
import { convertToLocale } from "@lib/util/money"

/** The add-ons (RAM, SSD, HDD...) chosen with a line item, under its title. */
export default function LineItemAddons({
  metadata,
  currencyCode,
}: {
  metadata: unknown
  currencyCode?: string
}) {
  const locale = useLocale()
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
          <span>{localize(a, "group", locale)}:</span>
          <span dir="auto" className="font-bold text-laly-ink">
            {localize(a, "name", locale)}
          </span>
          {currencyCode && a.price > 0 && (
            <span className="tabular-nums">
              (+
              {convertToLocale({
                amount: a.price,
                currency_code: currencyCode,
                locale: intlLocale(locale),
              })}
              )
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
