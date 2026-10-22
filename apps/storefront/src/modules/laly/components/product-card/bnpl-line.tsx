import type { BnplGateway } from "@lib/data/bnpl-offer"

// Wordmarks in each provider's colour, as on the checkout payment options.
const LOGO: Record<BnplGateway, { label: string; className: string }> = {
  taly: { label: "taly", className: "border-[#5b2be0] text-[#5b2be0]" },
  deema: { label: "deema", className: "border-[#0b8f6a] text-[#0b8f6a]" },
}

/**
 * The small instalment box under a card's price. Text is already translated
 * by the caller so this renders in server and client cards alike.
 */
export default function BnplLine({
  gateway,
  text,
  providerLabel,
}: {
  gateway: BnplGateway
  /** e.g. "قسّطها على 4 دفعات — 12.500 د.ك" */
  text: string
  /** Accessible name of the logo, e.g. "مع Taly". */
  providerLabel: string
}) {
  const logo = LOGO[gateway]
  return (
    <p
      className="mt-2 flex items-center justify-between gap-2 rounded-[10px] bg-laly-bg px-2 py-1.5 text-[11px] leading-tight text-laly-mut"
      data-testid={`bnpl-${gateway}`}
    >
      <span className="min-w-0 tabular-nums">{text}</span>
      <span
        dir="ltr"
        role="img"
        aria-label={providerLabel}
        className={`shrink-0 rounded-[6px] border bg-white px-1.5 font-latin text-[10px] font-extrabold lowercase ${logo.className}`}
      >
        {logo.label}
      </span>
    </p>
  )
}
