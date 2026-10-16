"use client"

import { ArrowRightOnRectangle, House } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { useParams, usePathname } from "next/navigation"

import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const mobileRowClass =
    "flex items-center justify-between w-full py-4 px-5 border-b border-laly-line last:border-b-0 text-laly-ink hover:bg-laly-teal-faint transition-colors"
  const forwardChevron = (
    <ChevronDown
      aria-hidden="true"
      className="-rotate-90 rtl:rotate-90 text-laly-mut"
    />
  )

  return (
    <div>
      <div className="small:hidden" data-testid="mobile-account-nav">
        {route !== `/${countryCode}/account` ? (
          <LocalizedClientLink
            href="/account"
            className="inline-flex items-center gap-x-2 text-small-regular font-semibold text-laly-teal py-2 mb-4"
            data-testid="account-main-link"
          >
            <>
              <ChevronDown
                aria-hidden="true"
                className="rotate-90 rtl:-rotate-90"
              />
              <span>حسابي</span>
            </>
          </LocalizedClientLink>
        ) : (
          <div className="flex flex-col gap-y-4 mb-6">
            <div className="rounded-card bg-laly-teal text-white p-5 shadow-laly">
              <div className="text-xl font-bold">
                أهلاً {customer?.first_name}
              </div>
              {customer?.email && (
                <div
                  className="text-small-regular text-white/80 mt-1 truncate"
                  dir="ltr"
                >
                  {customer.email}
                </div>
              )}
            </div>
            <div className="text-base-regular bg-white border border-laly-line rounded-card overflow-hidden">
              <ul>
                <li>
                  <LocalizedClientLink
                    href="/account/profile"
                    className={mobileRowClass}
                    data-testid="profile-link"
                  >
                    <>
                      <div className="flex items-center gap-x-3">
                        <User size={20} />
                        <span>الملف الشخصي</span>
                      </div>
                      {forwardChevron}
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/addresses"
                    className={mobileRowClass}
                    data-testid="addresses-link"
                  >
                    <>
                      <div className="flex items-center gap-x-3">
                        <MapPin size={20} />
                        <span>العناوين</span>
                      </div>
                      {forwardChevron}
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/orders"
                    className={mobileRowClass}
                    data-testid="orders-link"
                  >
                    <div className="flex items-center gap-x-3">
                      <Package size={20} />
                      <span>الطلبات</span>
                    </div>
                    {forwardChevron}
                  </LocalizedClientLink>
                </li>
                <li>
                  <button
                    type="button"
                    className={clx(mobileRowClass, "text-laly-red")}
                    onClick={handleLogout}
                    data-testid="logout-button"
                  >
                    <div className="flex items-center gap-x-3">
                      <ArrowRightOnRectangle className="rtl:-scale-x-100" />
                      <span>تسجيل الخروج</span>
                    </div>
                    {forwardChevron}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
      <div className="hidden small:block" data-testid="account-nav">
        <div className="bg-white border border-laly-line rounded-card p-4">
          <div className="pb-3 px-3">
            <h3 className="text-base-semi text-laly-ink">حسابي</h3>
          </div>
          <div className="text-base-regular">
            <ul className="flex mb-0 justify-start items-stretch flex-col gap-y-1">
              <li>
                <AccountNavLink
                  href="/account"
                  route={route!}
                  data-testid="overview-link"
                >
                  <House />
                  نظرة عامة
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/profile"
                  route={route!}
                  data-testid="profile-link"
                >
                  <User size={18} />
                  الملف الشخصي
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/addresses"
                  route={route!}
                  data-testid="addresses-link"
                >
                  <MapPin size={18} />
                  العناوين
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/orders"
                  route={route!}
                  data-testid="orders-link"
                >
                  <Package size={18} />
                  الطلبات
                </AccountNavLink>
              </li>
              <li className="border-t border-laly-line mt-2 pt-2">
                <button
                  type="button"
                  className="flex items-center gap-x-2 w-full px-3 py-2 rounded-btn text-laly-mut hover:text-laly-red hover:bg-laly-bg transition-colors"
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  <ArrowRightOnRectangle className="rtl:-scale-x-100" />
                  تسجيل الخروج
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

type AccountNavLinkProps = {
  href: string
  route: string
  children: React.ReactNode
  "data-testid"?: string
}

const AccountNavLink = ({
  href,
  route,
  children,
  "data-testid": dataTestId,
}: AccountNavLinkProps) => {
  const { countryCode }: { countryCode: string } = useParams()

  const active = route.split(countryCode)[1] === href
  return (
    <LocalizedClientLink
      href={href}
      className={clx(
        "flex items-center gap-x-2 px-3 py-2 rounded-btn transition-colors",
        active
          ? "bg-laly-teal-soft text-laly-teal-d font-bold"
          : "text-laly-mut hover:text-laly-ink hover:bg-laly-bg"
      )}
      aria-current={active ? "page" : undefined}
      data-testid={dataTestId}
    >
      {children}
    </LocalizedClientLink>
  )
}

export default AccountNav
