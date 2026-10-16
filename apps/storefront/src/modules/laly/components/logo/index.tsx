import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function Logo({
  inverted = false,
  withTagline = true,
}: {
  inverted?: boolean
  withTagline?: boolean
}) {
  return (
    <LocalizedClientLink
      href="/"
      className="flex items-center gap-x-2.5"
      aria-label="Laly — الصفحة الرئيسية"
      data-testid="nav-store-link"
    >
      {/* The wordmark stays LTR inside the RTL layout. */}
      <span
        dir="ltr"
        className={`font-latin text-[30px] font-extrabold leading-none tracking-[-1px] flex items-end ${
          inverted ? "text-white" : "text-laly-teal"
        }`}
      >
        laly
        <svg
          width="14"
          height="10"
          viewBox="0 0 14 10"
          className="ms-0.5 mb-1"
          aria-hidden="true"
        >
          <path
            d="M2 3c1.6 3.4 8.4 3.4 10 0"
            stroke="#E9B84C"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
      {withTagline && (
        <span
          className={`hidden small:block text-[11px] font-bold leading-tight ${
            inverted ? "text-white/70" : "text-laly-mut"
          }`}
        >
          شريكك التقني
        </span>
      )}
    </LocalizedClientLink>
  )
}
