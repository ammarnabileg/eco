import { intlLocale } from "@i18n/config"
import { getLocale, getT } from "@i18n/server"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = async ({ order }: ShippingDetailsProps) => {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  const address = order.shipping_address

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {t("order.delivery")}
      </Heading>
      <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
        <div className="flex flex-col" data-testid="shipping-address-summary">
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            {t("order.delivery_address")}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {address?.first_name} {address?.last_name}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {[address?.address_1, address?.address_2]
              .filter(Boolean)
              .join(t("order.list_separator"))}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {[address?.city, address?.province, address?.postal_code]
              .filter(Boolean)
              .join(t("order.list_separator"))}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {address?.country_code?.toLowerCase() === "kw"
              ? t("order.country_kw")
              : address?.country_code?.toUpperCase()}
          </Text>
        </div>

        <div className="flex flex-col" data-testid="shipping-contact-summary">
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            {t("order.contact_info")}
          </Text>
          {address?.phone && (
            <Text className="txt-medium text-ui-fg-subtle">
              <span dir="ltr">{address.phone}</span>
            </Text>
          )}
          <Text className="txt-medium text-ui-fg-subtle">
            <span dir="ltr">{order.email}</span>
          </Text>
        </div>

        <div className="flex flex-col" data-testid="shipping-method-summary">
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            {t("order.delivery_method")}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {(order.shipping_methods?.[0] as { name?: string })?.name} (
            {convertToLocale({
              amount: order.shipping_methods?.[0]?.total ?? 0,
              currency_code: order.currency_code,
              locale: intlLocale(locale),
            })}
            )
          </Text>
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default ShippingDetails
