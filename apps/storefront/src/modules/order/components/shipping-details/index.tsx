import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const address = order.shipping_address

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        التوصيل
      </Heading>
      <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
        <div className="flex flex-col" data-testid="shipping-address-summary">
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            عنوان التوصيل
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {address?.first_name} {address?.last_name}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {[address?.address_1, address?.address_2]
              .filter(Boolean)
              .join("، ")}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {[address?.city, address?.province, address?.postal_code]
              .filter(Boolean)
              .join("، ")}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {address?.country_code?.toLowerCase() === "kw"
              ? "الكويت"
              : address?.country_code?.toUpperCase()}
          </Text>
        </div>

        <div className="flex flex-col" data-testid="shipping-contact-summary">
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            معلومات التواصل
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
            طريقة التوصيل
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {(order.shipping_methods?.[0] as { name?: string })?.name} (
            {convertToLocale({
              amount: order.shipping_methods?.[0]?.total ?? 0,
              currency_code: order.currency_code,
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
