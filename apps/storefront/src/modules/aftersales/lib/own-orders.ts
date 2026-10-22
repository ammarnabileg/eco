import "server-only"

import { getLocale } from "@i18n/server"
import { intlLocale } from "@i18n/config"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import { convertToLocale } from "@lib/util/money"
import type { OwnOrder } from "../components/own-orders"

/** The signed-in customer's recent orders for a picker, or null when signed out. */
export async function ownOrders(): Promise<OwnOrder[] | null> {
  const customer = await retrieveCustomer()
  if (!customer) return null
  const [locale, orders] = await Promise.all([getLocale(), listOrders(20).catch(() => [])])
  const intl = intlLocale(locale)
  return (orders ?? [])
    .filter((o) => o.status !== "canceled" && o.display_id)
    .map((o) => ({
      display_id: Number(o.display_id),
      date: new Date(o.created_at).toLocaleDateString(intl, { dateStyle: "medium" }),
      total: convertToLocale({ amount: o.total, currency_code: o.currency_code, locale: intl }),
    }))
}
