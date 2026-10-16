import { clx } from "@modules/common/components/ui"

/** A sidebar filter section: white card with a bold heading. */
const FilterCard = ({
  title,
  children,
  className,
  "data-testid": dataTestId,
}: {
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
  "data-testid"?: string
}) => (
  <section
    className={clx(
      "bg-white border border-laly-line rounded-card p-4",
      className
    )}
    data-testid={dataTestId}
  >
    {title && (
      <h2 className="mb-3 text-sm font-extrabold text-laly-ink">{title}</h2>
    )}
    {children}
  </section>
)

export default FilterCard
