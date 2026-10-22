import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listSupportRequests } from "@lib/data/aftersales"
import { getLocale, getT } from "@i18n/server"
import { intlLocale } from "@i18n/config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("aftersales.support_title"), description: t("aftersales.support_intro") }
}

type Row = { id: string; title: React.ReactNode; meta: string[]; status: string; href?: string }

// The customer's own installation, quote and after-sales requests with their status.
export default async function SupportRequests() {
  const [t, locale, data] = await Promise.all([getT(), getLocale(), listSupportRequests()])
  if (!data) notFound()
  const intl = intlLocale(locale)
  const date = (d: string) => new Date(d).toLocaleDateString(intl, { dateStyle: "medium" })

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: t("aftersales.support_after_sales"),
      rows: data.after_sales_requests.map((r) => ({
        id: r.id,
        title: `${t(`aftersales.kind_${r.kind}`)} · ${t("aftersales.order_title", { id: r.order_display_id })}`,
        meta: [
          ...(r.items ?? []).map((i) => `${i.title} × ${i.quantity}`),
          t(`aftersales.reason_${r.reason}`),
          t("aftersales.sent_on", { date: date(r.created_at) }),
        ],
        status: t(`aftersales.asreq_${r.status}`),
      })),
    },
    {
      title: t("aftersales.support_installs"),
      rows: data.install_requests.map((r) => ({
        id: r.id,
        title: t(`service.service_${r.service}`),
        meta: [
          ...(r.preferred_date ? [t("aftersales.preferred_date", { date: r.preferred_date })] : []),
          t("aftersales.sent_on", { date: date(r.created_at) }),
        ],
        status: t(`aftersales.ireq_${r.status}`),
      })),
    },
    {
      title: t("aftersales.support_quotes"),
      rows: data.quote_requests.map((r) => ({
        id: r.id,
        title: <bdi>{r.product_title}</bdi>,
        meta: [t("aftersales.quantity", { count: r.quantity }), t("aftersales.sent_on", { date: date(r.created_at) })],
        status: t(`aftersales.qreq_${r.status}`),
      })),
    },
  ].filter((g) => g.rows.length)

  return (
    <div className="w-full" data-testid="support-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl font-bold text-laly-ink">{t("aftersales.support_title")}</h1>
        <p className="text-base-regular text-laly-mut">{t("aftersales.support_intro")}</p>
        <LocalizedClientLink
          href="/returns"
          className="self-start rounded-btn border border-laly-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-laly-teal hover:border-laly-teal"
        >
          {t("aftersales.new_return_request")}
        </LocalizedClientLink>
      </div>
      {!groups.length ? (
        <p className="bg-white border border-laly-line rounded-card p-5 text-laly-mut">{t("aftersales.support_empty")}</p>
      ) : (
        <div className="grid gap-6">
          {groups.map((g) => (
            <section key={g.title} className="bg-white border border-laly-line rounded-card p-4 small:p-5">
              <h2 className="font-extrabold text-laly-ink">{g.title}</h2>
              <ul className="mt-2 divide-y divide-laly-line">
                {g.rows.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-bold text-laly-ink">{r.title}</p>
                      {r.meta.map((m, i) => (
                        <p key={i} className="text-[13px] text-laly-mut">
                          {m}
                        </p>
                      ))}
                    </div>
                    <span className="shrink-0 rounded-full bg-laly-teal-soft px-3 py-1 text-[12.5px] font-bold text-laly-teal">
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
