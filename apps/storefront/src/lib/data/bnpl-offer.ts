// Pure helpers for the instalment line on product cards. Safe to import from
// client and server components; the data comes from GET /store/bnpl.

export type BnplGateway = "taly" | "deema"
export type BnplEligibility = Record<BnplGateway, boolean>
export type BnplGatewayTerms = {
  /** Switched on in the admin with all its keys. */
  active: boolean
  instalments: number
  min_amount: number | null
  max_amount: number | null
}
export type BnplListing = {
  products: Record<string, BnplEligibility>
  gateways: Partial<Record<BnplGateway, BnplGatewayTerms>>
}

export const EMPTY_BNPL_LISTING: BnplListing = { products: {}, gateways: {} }

export type BnplOffer = { gateway: BnplGateway; instalments: number; amount: number }

// Taly first, as in the phone design; Deema when Taly does not apply.
const ORDER: BnplGateway[] = ["taly", "deema"]

/**
 * The instalment a card shows for one product at one price, or null when no
 * switched-on gateway accepts the product at that amount. Amounts are KWD
 * (the gateways' only currency), rounded to 3 decimals.
 */
export function bnplOffer(
  listing: BnplListing,
  productId: string,
  price: number | null | undefined,
  currencyCode: string | null | undefined
): BnplOffer | null {
  if (typeof price !== "number" || !(price > 0)) return null
  if ((currencyCode ?? "").toLowerCase() !== "kwd") return null
  const eligible = listing.products[productId]
  if (!eligible) return null
  for (const gateway of ORDER) {
    const terms = listing.gateways[gateway]
    if (!eligible[gateway] || !terms?.active || !(terms.instalments > 0)) continue
    if (terms.min_amount != null && price < terms.min_amount) continue
    if (terms.max_amount != null && price > terms.max_amount) continue
    return {
      gateway,
      instalments: terms.instalments,
      amount: Math.round((price / terms.instalments) * 1000) / 1000,
    }
  }
  return null
}
