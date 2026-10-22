import type { Locale } from "@i18n/config"
import type { SpecGroup } from "@lib/util/catalog"
import { localize } from "@lib/util/localize"

/**
 * The product's spec table, grouped as the category template groups it.
 * Group names, labels and values come from the backend in each language.
 */
export default function ProductSpecs({
  groups,
  locale,
}: {
  groups: SpecGroup[]
  locale: Locale
}) {
  return (
    <div className="flex flex-col gap-5" data-testid="product-specs">
      {groups.map((group, i) => {
        const name = localize(group, "group", locale)
        return (
        <section key={group.group_ar ?? `group-${i}`}>
          {name && (
            <h3 className="mb-2 text-sm font-extrabold text-laly-teal">
              {name}
            </h3>
          )}
          <table className="w-full text-sm border border-laly-line rounded-[12px] overflow-hidden border-separate border-spacing-0">
            <tbody>
              {group.rows.map((row, j) => (
                <tr key={row.key} className={j % 2 ? "bg-white" : "bg-laly-bg"}>
                  <th
                    scope="row"
                    className="w-2/5 px-3 py-2.5 text-start font-normal text-laly-mut align-top"
                  >
                    {localize(row, "label", locale)}
                  </th>
                  <td dir="auto" className="px-3 py-2.5 font-bold align-top">
                    {localize(row, "value", locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        )
      })}
    </div>
  )
}
