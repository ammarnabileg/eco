// Arabic display helpers shared by the account and order modules.

const DATE_LOCALE = "ar-KW-u-nu-latn"

/** Formats an order date in Arabic with Latin digits (e.g. "16 أكتوبر 2026"). */
export const formatOrderDate = (
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
) => {
  if (!date) {
    return ""
  }

  return new Date(date).toLocaleDateString(DATE_LOCALE, {
    timeZone: "Asia/Kuwait",
    ...options,
  })
}

/** Formats a date and time in Arabic with Latin digits. */
export const formatOrderDateTime = (date: string | Date | null | undefined) =>
  formatOrderDate(date, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

/** "قطعة واحدة" / "قطعتان" / "3 قطع" / "11 قطعة" */
export const formatItemCount = (count: number) => {
  if (count === 1) {
    return "قطعة واحدة"
  }

  if (count === 2) {
    return "قطعتان"
  }

  if (count >= 3 && count <= 10) {
    return `${count} قطع`
  }

  return `${count} قطعة`
}

const FULFILLMENT_STATUS: Record<string, string> = {
  not_fulfilled: "قيد التجهيز",
  partially_fulfilled: "تم تجهيز جزء من الطلب",
  fulfilled: "تم التجهيز",
  partially_shipped: "تم شحن جزء من الطلب",
  shipped: "تم الشحن",
  partially_delivered: "تم توصيل جزء من الطلب",
  delivered: "تم التوصيل",
  canceled: "ملغي",
}

const PAYMENT_STATUS: Record<string, string> = {
  not_paid: "غير مدفوع",
  awaiting: "بانتظار الدفع",
  authorized: "تم التفويض",
  partially_authorized: "تم تفويض جزء من المبلغ",
  captured: "مدفوع",
  partially_captured: "مدفوع جزئيًا",
  partially_refunded: "مسترد جزئيًا",
  refunded: "مسترد",
  canceled: "ملغي",
  requires_action: "يتطلب إجراء",
}

const humanize = (str: string) => {
  const formatted = str.split("_").join(" ")
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
}

export const formatFulfillmentStatus = (status?: string | null) =>
  status ? FULFILLMENT_STATUS[status] ?? humanize(status) : ""

export const formatPaymentStatus = (status?: string | null) =>
  status ? PAYMENT_STATUS[status] ?? humanize(status) : ""
