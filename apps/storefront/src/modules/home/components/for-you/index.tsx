import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import { getRecommendations } from "@lib/data/recommendations"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductSection from "@modules/home/components/product-section"
import { formatFulfillmentStatus } from "@modules/order/util/format"

const PICKS_TITLE = {
  orders: { title: "مختار لك", eyebrow: "على حسب مشترياتك" },
  views: { title: "ممكن يعجبك كمان", eyebrow: "على حسب اللي شفته" },
} as const

const orderStatus = (o: HttpTypes.StoreOrder) =>
  o.status === "canceled" ? "ملغي" : formatFulfillmentStatus(o.fulfillment_status) || "قيد التجهيز"

/**
 * The personal part of the homepage: a greeting with the last order for
 * signed-in customers, recently viewed products, picks and "buy again".
 * Renders nothing for a first-time visitor.
 */
export default async function ForYou({
  region,
  offerEnds = {},
  place = "home",
}: {
  region: HttpTypes.StoreRegion
  offerEnds?: Record<string, string>
  place?: "home" | "account"
}) {
  const [customer, recs] = await Promise.all([retrieveCustomer().catch(() => null), getRecommendations(8)])
  const lastOrder =
    place === "home" && customer ? ((await listOrders(1).catch(() => null)) ?? [])[0] ?? null : null
  const picks = recs.based_on === "popular" ? null : PICKS_TITLE[recs.based_on]

  return (
    <>
      {place === "home" && customer && (
        <section className="content-container mt-6">
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-laly-line bg-white p-4 small:p-5"
            data-testid="for-you-greeting"
          >
            <div>
              <p className="text-lg font-extrabold text-laly-ink">أهلاً {customer.first_name || "بيك"}</p>
              {lastOrder ? (
                <p className="text-sm text-laly-mut">
                  آخر طلب #{lastOrder.display_id}: <span className="font-bold text-laly-teal">{orderStatus(lastOrder)}</span>
                </p>
              ) : (
                <p className="text-sm text-laly-mut">نورت Laly تاني.</p>
              )}
            </div>
            <div className="flex gap-2">
              {lastOrder && (
                <LocalizedClientLink
                  href={`/account/orders/details/${lastOrder.id}`}
                  className="rounded-btn bg-laly-teal px-4 py-2 text-sm font-bold text-white"
                >
                  تتبع الطلب
                </LocalizedClientLink>
              )}
              <LocalizedClientLink
                href="/account"
                className="rounded-btn border border-laly-line px-4 py-2 text-sm font-bold text-laly-ink"
              >
                حسابي
              </LocalizedClientLink>
            </div>
          </div>
        </section>
      )}
      {recs.viewed.length > 0 && (
        <ProductSection
          title="كمّل من حيث وقفت"
          eyebrow="شفتها مؤخراً"
          region={region}
          layout="rail"
          productIds={recs.viewed}
          offerEnds={offerEnds}
          contained={place === "home"}
        />
      )}
      {picks && (
        <ProductSection
          title={picks.title}
          eyebrow={picks.eyebrow}
          region={region}
          layout="rail"
          productIds={recs.for_you}
          offerEnds={offerEnds}
          contained={place === "home"}
        />
      )}
      {recs.buy_again.length > 0 && (
        <ProductSection
          title="اشتريه تاني"
          eyebrow="من طلباتك السابقة"
          region={region}
          layout="rail"
          productIds={recs.buy_again}
          offerEnds={offerEnds}
          contained={place === "home"}
        />
      )}
    </>
  )
}
