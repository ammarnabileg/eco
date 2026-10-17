import type { SpecGroup } from "@lib/util/catalog"

/** The product's spec table, grouped as the category template groups it. */
export default function ProductSpecs({ groups }: { groups: SpecGroup[] }) {
  return (
    <div className="flex flex-col gap-5" data-testid="product-specs">
      {groups.map((group, i) => (
        <section key={group.group_ar ?? `group-${i}`}>
          {group.group_ar && (
            <h3 className="mb-2 text-sm font-extrabold text-laly-teal">
              {group.group_ar}
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
                    {row.label_ar}
                  </th>
                  <td dir="auto" className="px-3 py-2.5 font-bold align-top">
                    {row.value_ar}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
