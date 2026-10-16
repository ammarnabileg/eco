import ChevronDown from "@modules/common/icons/chevron-down"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { formatOrderDate } from "@modules/order/util/format"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  const completion = getProfileCompletion(customer)
  const addressesCount = customer?.addresses?.length || 0

  return (
    <div className="flex flex-col gap-y-5" data-testid="overview-page-wrapper">
      {/* Greeting (the mobile account nav shows its own greeting) */}
      <div className="hidden small:flex flex-col gap-y-2 rounded-card bg-laly-teal text-white p-6 shadow-laly">
        <span
          className="text-2xl font-bold"
          data-testid="welcome-message"
          data-value={customer?.first_name}
        >
          أهلاً {customer?.first_name}
        </span>
        <span className="text-small-regular text-white/80">
          مسجّل الدخول بالبريد:{" "}
          <span
            className="font-semibold text-white"
            dir="ltr"
            data-testid="customer-email"
            data-value={customer?.email}
          >
            {customer?.email}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
        <LocalizedClientLink
          href="/account/profile"
          className="group bg-white border border-laly-line rounded-card p-5 flex flex-col gap-y-3 hover:border-laly-teal transition-colors"
        >
          <div className="flex items-center gap-x-2 text-laly-ink">
            <span className="flex items-center justify-center w-9 h-9 rounded-btn bg-laly-teal-soft text-laly-teal">
              <User size={18} />
            </span>
            <h3 className="text-base-semi">الملف الشخصي</h3>
          </div>
          <div className="flex items-end gap-x-2">
            <span
              className="text-3xl font-bold leading-none text-laly-ink"
              data-testid="customer-profile-completion"
              data-value={completion}
            >
              {completion}%
            </span>
            <span className="text-small-regular text-laly-mut">مكتمل</span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-laly-teal-soft overflow-hidden"
            role="progressbar"
            aria-label="نسبة اكتمال الملف الشخصي"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-laly-teal"
              style={{ width: `${completion}%` }}
            />
          </div>
        </LocalizedClientLink>

        <LocalizedClientLink
          href="/account/addresses"
          className="group bg-white border border-laly-line rounded-card p-5 flex flex-col gap-y-3 hover:border-laly-teal transition-colors"
        >
          <div className="flex items-center gap-x-2 text-laly-ink">
            <span className="flex items-center justify-center w-9 h-9 rounded-btn bg-laly-teal-soft text-laly-teal">
              <MapPin size={18} />
            </span>
            <h3 className="text-base-semi">العناوين</h3>
          </div>
          <div className="flex items-end gap-x-2">
            <span
              className="text-3xl font-bold leading-none text-laly-ink"
              data-testid="addresses-count"
              data-value={addressesCount}
            >
              {addressesCount}
            </span>
            <span className="text-small-regular text-laly-mut">
              {addressesCount === 1 ? "عنوان محفوظ" : "عناوين محفوظة"}
            </span>
          </div>
          <span className="text-small-regular font-semibold text-laly-teal group-hover:text-laly-teal-d">
            إدارة العناوين
          </span>
        </LocalizedClientLink>
      </div>

      <div className="bg-white border border-laly-line rounded-card p-5 flex flex-col gap-y-4">
        <div className="flex items-center justify-between gap-x-2">
          <div className="flex items-center gap-x-2 text-laly-ink">
            <span className="flex items-center justify-center w-9 h-9 rounded-btn bg-laly-teal-soft text-laly-teal">
              <Package size={18} />
            </span>
            <h3 className="text-base-semi">أحدث الطلبات</h3>
          </div>
          {orders && orders.length > 0 && (
            <LocalizedClientLink
              href="/account/orders"
              className="text-small-regular font-semibold text-laly-teal hover:text-laly-teal-d"
            >
              عرض كل الطلبات
            </LocalizedClientLink>
          )}
        </div>
        <ul className="flex flex-col gap-y-3" data-testid="orders-wrapper">
          {orders && orders.length > 0 ? (
            orders.slice(0, 5).map((order) => {
              return (
                <li
                  key={order.id}
                  data-testid="order-wrapper"
                  data-value={order.id}
                >
                  <LocalizedClientLink
                    href={`/account/orders/details/${order.id}`}
                    className="flex justify-between items-center gap-x-3 p-4 rounded-btn bg-laly-bg hover:bg-laly-teal-faint border border-transparent hover:border-laly-teal-soft transition-colors"
                  >
                    <div className="grid grid-cols-1 xsmall:grid-cols-3 text-small-regular gap-x-4 gap-y-1 flex-1">
                      <div className="flex xsmall:flex-col gap-x-2">
                        <span className="text-laly-mut">تاريخ الطلب</span>
                        <span
                          className="text-laly-ink font-semibold"
                          data-testid="order-created-date"
                        >
                          {formatOrderDate(order.created_at)}
                        </span>
                      </div>
                      <div className="flex xsmall:flex-col gap-x-2">
                        <span className="text-laly-mut">رقم الطلب</span>
                        <span
                          className="text-laly-ink font-semibold"
                          data-testid="order-id"
                          data-value={order.display_id}
                        >
                          #{order.display_id}
                        </span>
                      </div>
                      <div className="flex xsmall:flex-col gap-x-2">
                        <span className="text-laly-mut">الإجمالي</span>
                        <span
                          className="text-laly-ink font-semibold"
                          data-testid="order-amount"
                        >
                          {convertToLocale({
                            amount: order.total,
                            currency_code: order.currency_code,
                          })}
                        </span>
                      </div>
                    </div>
                    <span
                      className="flex items-center justify-center text-laly-teal"
                      data-testid="open-order-button"
                    >
                      <span className="sr-only">
                        عرض الطلب #{order.display_id}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className="-rotate-90 rtl:rotate-90"
                      />
                    </span>
                  </LocalizedClientLink>
                </li>
              )
            })
          ) : (
            <li className="flex flex-col items-start gap-y-3 py-2">
              <span
                className="text-base-regular text-laly-mut"
                data-testid="no-orders-message"
              >
                لا توجد طلبات حديثة
              </span>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center h-10 px-4 rounded-btn bg-laly-teal text-white font-bold hover:bg-laly-teal-d transition-colors"
              >
                ابدأ التسوق
              </LocalizedClientLink>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview
