import { Metadata } from "next"

import { getTrackedOrder } from "@lib/data/aftersales"
import { getStoreContent } from "@lib/data/content"
import { whatsappLink } from "@lib/util/localize"
import { getT, languageAlternates } from "@i18n/server"
import OwnOrders from "@modules/aftersales/components/own-orders"
import PolicyLinks from "@modules/aftersales/components/policy-links"
import ReturnForm from "@modules/aftersales/components/return-form"
import StopTracking from "@modules/aftersales/components/stop-tracking"
import TrackForm from "@modules/aftersales/components/track-form"
import { ownOrders } from "@modules/aftersales/lib/own-orders"
import PageBanner from "@modules/laly/components/page-banner"

type Props = { params: Promise<{ countryCode: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode } = await params
  const t = await getT()
  return {
    title: t("aftersales.returns_title"),
    description: t("aftersales.returns_meta_description"),
    alternates: await languageAlternates(countryCode),
  }
}

// Return, exchange and warranty requests. The terms are the owner's published
// policy pages (linked when published); this page only collects the request.
// Signed-in customers pick one of their orders; guests verify an order by
// WhatsApp first (same flow as /track-order).
export default async function ReturnsPage() {
  const [t, tracked, orders, { settings }] = await Promise.all([getT(), getTrackedOrder(), ownOrders(), getStoreContent()])
  const whatsapp = whatsappLink(settings.whatsapp, t("aftersales.contact_whatsapp_message"))
  const order = tracked && tracked.status !== "canceled" ? tracked : null

  return (
    <>
      <PageBanner title={t("aftersales.returns_title")} intro={t("aftersales.returns_intro")} />
      <div className="content-container !px-3.5 small:!px-6 py-4 small:py-12">
        <div className="grid gap-6 small:gap-10 items-start small:grid-cols-[minmax(0,1fr)_440px]">
          <aside className="bg-white border border-laly-line rounded-card p-4 small:p-7 grid gap-4 small:order-2">
            <h2 className="text-lg font-extrabold text-laly-ink">{t("aftersales.how_title")}</h2>
            <ol className="grid gap-3">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-laly-teal-soft text-laly-teal font-extrabold flex items-center justify-center">
                    {n}
                  </span>
                  <span className="pt-0.5 text-laly-ink">{t(`aftersales.how_step_${n}`)}</span>
                </li>
              ))}
            </ol>
            <p className="text-[12.5px] text-laly-mut">{t("aftersales.how_note")}</p>
            <PolicyLinks />
          </aside>

          <div className="grid gap-4 small:order-1">
            {order ? (
              <>
                <ReturnForm order={order} signedIn={orders !== null} />
                <div className="text-center">
                  <StopTracking label={t("aftersales.change_order")} />
                </div>
              </>
            ) : orders ? (
              <section className="bg-white border border-laly-line rounded-card p-4 small:p-7 grid gap-4">
                <h2 className="text-lg font-extrabold text-laly-ink">{t("aftersales.pick_order")}</h2>
                <OwnOrders orders={orders} />
              </section>
            ) : (
              <>
                <h2 className="text-lg font-extrabold text-laly-ink">{t("aftersales.pick_order_guest")}</h2>
                <TrackForm whatsapp={whatsapp} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
