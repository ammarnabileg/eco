import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

// Arabic (Kuwait) with Latin digits: "74.900 د.ك".
export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "ar-KW-u-nu-latn",
}: ConvertToLocaleParams) => {
  if (!currency_code || isEmpty(currency_code)) {
    return amount.toString()
  }

  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency_code,
    minimumFractionDigits,
    maximumFractionDigits,
  }).formatToParts(amount)

  // Intl renders the Arabic symbol as "د.ك." and wraps it in RTL marks, which
  // shows up as a stray leading dot in RTL text. Use the conventional "د.ك".
  return parts
    .map((part) =>
      part.type === "currency" ? part.value.replace(/\.$/, "") : part.value
    )
    .join("")
    .replace(/[‎‏]/g, "")
    .trim()
}
