import { Metadata } from "next"

import { getTrackedOrder } from "@lib/data/aftersales"
import { getStoreContent } from "@lib/data/content"
import { retrieveCustomer } from "@lib/data/customer"
import { whatsappLink } from "@lib/util/localize"
import { getT, languageAlternates } from "@i18n/server"
import OrderStatus from "@modules/aftersales/components/order-status"
import StopTracking from "@modules/aftersales/components/stop-tracking"
import TrackForm from "@modules/aftersales/components/track-form"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PageBanner from "@modules/laly/components/page-banner"

type Props = { params: Promise<{ countryCode: string }>; searchParams: Promise<{ order?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode } = await params
  const t = await getT()
  return {
    title: t("aftersales.track_title"),
    description: t("aftersales.track_meta_description"),
    alternates: await languageAlternates(countryCode),
    robots: { index: false },
  }
}

// Guest order tracking: order number + phone, a WhatsApp code, then the
// order's status for 30 minutes (httpOnly cookie).
export default async function TrackOrderPage({ searchParams }: Props) {
  const [t, order, customer, { settings }, { order: preset }] = await Promise.all([
    getT(),
    getTrackedOrder(),
    retrieveCustomer(),
    getStoreContent(),
    searchParams,
  ])
  const whatsapp = whatsappLink(settings.whatsapp, t("aftersales.contact_whatsapp_message"))

  return (
    <>
      <PageBanner title={t("aftersales.track_title")} intro={t("aftersales.track_intro")} />
      <div className="content-container !px-3.5 small:!px-6 py-4 small:py-12">
        <div className="max-w-xl mx-auto grid gap-4">
          {order ? (
            <OrderStatus
              order={order}
              actions={
                <>
                  {order.status !== "canceled" && (
                    <LocalizedClientLink
                      href="/returns"
                      className="rounded-btn border border-laly-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-laly-teal hover:border-laly-teal"
                    >
                      {t("aftersales.request_return")}
                    </LocalizedClientLink>
                  )}
                  <StopTracking label={t("aftersales.track_another")} />
                </>
              }
            />
          ) : (
            <>
              <TrackForm whatsapp={whatsapp} defaultOrder={(preset ?? "").replace(/\D/g, "").slice(0, 12)} />
              {customer && (
                <p className="text-center text-[13.5px] text-laly-mut">
                  {t("aftersales.signed_in_hint")}{" "}
                  <LocalizedClientLink href="/account/orders" className="font-bold text-laly-teal underline underline-offset-4">
                    {t("aftersales.my_orders")}
                  </LocalizedClientLink>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
