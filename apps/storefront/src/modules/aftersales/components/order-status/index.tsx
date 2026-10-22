import { ReactNode } from "react"

import { getLocale, getT } from "@i18n/server"
import { intlLocale } from "@i18n/config"
import { TrackedOrder } from "@lib/data/aftersales"
import { convertToLocale } from "@lib/util/money"
import Icon from "@modules/laly/components/icon"

// The tracked order: status steps (from the store's order, payment and
// fulfillment records), items and totals. No address or payment details.
export default async function OrderStatus({ order, actions }: { order: TrackedOrder; actions?: ReactNode }) {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  const intl = intlLocale(locale)
  const money = (amount: number) => convertToLocale({ amount, currency_code: order.currency_code, locale: intl })
  const date = (d: string | null) =>
    d ? new Date(d).toLocaleString(intl, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuwait" }) : null
  const steps = order.status === "canceled" ? order.timeline.filter((s) => s.done) : order.timeline

  return (
    <div className="grid gap-4">
      <section className="bg-white border border-laly-line rounded-card p-4 small:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-extrabold text-laly-ink">{t("aftersales.order_title", { id: order.display_id })}</h2>
          <span className="text-[13px] text-laly-mut">{t("aftersales.placed_on", { date: date(order.created_at) ?? "" })}</span>
        </div>
        <ol className="mt-5 grid gap-0">
          {steps.map((s, i) => {
            const canceled = s.key === "canceled"
            return (
              <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && (
                  <span aria-hidden className={`absolute start-[13px] top-7 bottom-0 w-0.5 ${s.done ? "bg-laly-teal" : "bg-laly-line"}`} />
                )}
                <span
                  className={`relative z-[1] w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${
                    canceled ? "bg-red-100 text-red-600" : s.done ? "bg-laly-teal text-white" : "bg-laly-line/60 text-laly-mut"
                  }`}
                >
                  {s.done ? <Icon name="check" size={15} /> : <span className="w-2 h-2 rounded-full bg-current" />}
                </span>
                <span className="pt-0.5">
                  <span className={`block font-bold ${canceled ? "text-red-600" : s.done ? "text-laly-ink" : "text-laly-mut"}`}>
                    {t(`aftersales.status_${s.key}`)}
                  </span>
                  {s.at && <span className="block text-[12.5px] text-laly-mut">{date(s.at)}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="bg-white border border-laly-line rounded-card p-4 small:p-7">
        <h3 className="font-extrabold text-laly-ink">{t("aftersales.items")}</h3>
        <ul className="mt-3 divide-y divide-laly-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnail} alt="" className="w-14 h-14 rounded-btn object-contain bg-laly-bg border border-laly-line" />
              ) : (
                <span className="w-14 h-14 rounded-btn bg-laly-bg border border-laly-line" />
              )}
              <span className="flex-1 min-w-0">
                <bdi className="block font-bold text-laly-ink truncate">{item.title}</bdi>
                {item.variant_title && <bdi className="block text-[12.5px] text-laly-mut">{item.variant_title}</bdi>}
                <span className="block text-[12.5px] text-laly-mut">{t("aftersales.quantity", { count: item.quantity })}</span>
              </span>
              <span className="font-bold text-laly-ink whitespace-nowrap">{money(item.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid gap-1.5 border-t border-laly-line pt-3 text-[14px]">
          <Row label={t("aftersales.subtotal")} value={money(order.subtotal)} />
          {order.shipping_total > 0 && <Row label={t("aftersales.shipping")} value={money(order.shipping_total)} />}
          {order.discount_total > 0 && <Row label={t("aftersales.discount")} value={`- ${money(order.discount_total)}`} />}
          {order.tax_total > 0 && <Row label={t("aftersales.tax")} value={money(order.tax_total)} />}
          <div className="flex justify-between font-extrabold text-laly-ink text-[16px]">
            <dt>{t("aftersales.total")}</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>
      </section>
      {actions && <div className="flex flex-wrap items-center gap-4">{actions}</div>}
    </div>
  )
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-laly-mut">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
)
