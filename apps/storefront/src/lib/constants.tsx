import { CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import React from "react"

// Text-in-pill marks for the Kuwaiti gateways (no third-party brand files).
const Mark = ({ label, className }: { label: string; className?: string }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none ${className ?? "border-laly-line text-laly-ink"}`}
    dir="ltr"
  >
    {label}
  </span>
)

/**
 * A payment provider's label (a message key, e.g. "checkout.pay_method_knet",
 * shown with t(info.titleKey)) and icon.
 */
export type PaymentInfo = { titleKey: string; icon: React.JSX.Element }

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<string, PaymentInfo> = {
  pp_stripe_stripe: {
    titleKey: "checkout.pay_method_credit_card",
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    titleKey: "checkout.pay_method_credit_card",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    titleKey: "checkout.pay_method_ideal",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    titleKey: "checkout.pay_method_bancontact",
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    titleKey: "checkout.pay_method_paypal",
    icon: <PayPal />,
  },
  pp_klickpay_knet: {
    titleKey: "checkout.pay_method_knet",
    icon: <Mark label="KNET" className="border-[#1b5faa] text-[#1b5faa]" />,
  },
  pp_klickpay_card: {
    titleKey: "checkout.pay_method_card",
    icon: <Mark label="VISA · MC" />,
  },
  pp_klickpay_apple_pay: {
    titleKey: "checkout.pay_method_apple_pay",
    icon: <Mark label="Apple Pay" className="border-black text-black" />,
  },
  pp_klickpay_google_pay: {
    titleKey: "checkout.pay_method_google_pay",
    icon: <Mark label="G Pay" />,
  },
  pp_klickpay_samsung_pay: {
    titleKey: "checkout.pay_method_samsung_pay",
    icon: <Mark label="Samsung Pay" />,
  },
  pp_taly_taly: {
    titleKey: "checkout.pay_method_taly",
    icon: <Mark label="taly" className="border-[#5b2be0] text-[#5b2be0]" />,
  },
  pp_deema_deema: {
    titleKey: "checkout.pay_method_deema",
    icon: <Mark label="deema" className="border-[#0b8f6a] text-[#0b8f6a]" />,
  },
  pp_system_default: {
    titleKey: "checkout.pay_method_manual",
    icon: <CreditCard />,
  },
  // Add more payment providers here
}

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
/** Gateways that take the customer to their own hosted page (KNET, Taly, Deema...). */
export const isRedirectGateway = (providerId?: string) =>
  !!providerId &&
  ["pp_klickpay_", "pp_taly_", "pp_deema_"].some((p) => providerId.startsWith(p))

export const isBnpl = (providerId?: string) =>
  !!providerId && (providerId.startsWith("pp_taly_") || providerId.startsWith("pp_deema_"))

/** Deema does not accept orders below 1 KWD. */
export const DEEMA_MIN_TOTAL = 1

export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
