// Display helpers shared by the account and order modules. Pass the page's
// language (locale / t); without them they fall back to Arabic, the default.

import { DEFAULT_LOCALE, intlLocale, Locale } from "@i18n/config"
import { MESSAGES } from "@i18n/messages"
import { makeT, Translate } from "@i18n/translate"

const defaultT: Translate = makeT([MESSAGES[DEFAULT_LOCALE]])

/** Formats an order date with Latin digits (e.g. "16 أكتوبر 2026" / "16 October 2026"). */
export const formatOrderDate = (
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  },
  locale: Locale = DEFAULT_LOCALE
) => {
  if (!date) {
    return ""
  }

  return new Date(date).toLocaleDateString(intlLocale(locale), {
    timeZone: "Asia/Kuwait",
    ...options,
  })
}

/** Formats a date and time with Latin digits. */
export const formatOrderDateTime = (
  date: string | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE
) =>
  formatOrderDate(
    date,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    locale
  )

/** Arabic: one / two / 3-10 / 11+ forms ("قطعة واحدة", "قطعتان", "3 قطع", "11 قطعة"). */
export const formatItemCount = (count: number, t: Translate = defaultT) => {
  if (count === 1) {
    return t("order.item_count_one")
  }

  if (count === 2) {
    return t("order.item_count_two")
  }

  if (count >= 3 && count <= 10) {
    return t("order.item_count_few", { count })
  }

  return t("order.item_count_many", { count })
}

const FULFILLMENT_STATUSES = [
  "not_fulfilled",
  "partially_fulfilled",
  "fulfilled",
  "partially_shipped",
  "shipped",
  "partially_delivered",
  "delivered",
  "canceled",
]

const PAYMENT_STATUSES = [
  "not_paid",
  "awaiting",
  "authorized",
  "partially_authorized",
  "captured",
  "partially_captured",
  "partially_refunded",
  "refunded",
  "canceled",
  "requires_action",
]

const humanize = (str: string) => {
  const formatted = str.split("_").join(" ")
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
}

export const formatFulfillmentStatus = (
  status?: string | null,
  t: Translate = defaultT
) =>
  status
    ? FULFILLMENT_STATUSES.includes(status)
      ? t(`order.fulfillment_${status}`)
      : humanize(status)
    : ""

export const formatPaymentStatus = (
  status?: string | null,
  t: Translate = defaultT
) =>
  status
    ? PAYMENT_STATUSES.includes(status)
      ? t(`order.payment_${status}`)
      : humanize(status)
    : ""
