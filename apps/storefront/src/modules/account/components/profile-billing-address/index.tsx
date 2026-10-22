"use client"

import React, { useActionState, useEffect, useMemo } from "react"

import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"

import { addCustomerAddress, updateCustomerAddress } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import AccountInfo from "../account-info"
import {
  GovernorateSelect,
  KuwaitPhoneInput,
  governorateLabel,
} from "../kuwait-address-fields"
import { useT } from "@i18n/client"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
  regions: HttpTypes.StoreRegion[]
}

const ProfileBillingAddress: React.FC<MyInformationProps> = ({
  customer,
  regions,
}) => {
  const t = useT()
  const regionOptions = useMemo(() => {
    return (
      regions
        ?.map((region) => {
          return region.countries?.map((country) => ({
            value: country.iso_2,
            label: country.display_name,
          }))
        })
        .flat() || []
    )
  }, [regions])

  const [successState, setSuccessState] = React.useState(false)

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  const initialState: Record<string, unknown> = {
    isDefaultBilling: true,
    isDefaultShipping: false,
    error: false,
    success: false,
  }

  if (billingAddress) {
    initialState.addressId = billingAddress.id
  }

  const [state, formAction] = useActionState(
    billingAddress ? updateCustomerAddress : addCustomerAddress,
    initialState
  )

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(!!state.success)
  }, [state])

  const currentInfo = useMemo(() => {
    if (!billingAddress) {
      return t("account.no_billing_address")
    }

    const country =
      regionOptions?.find(
        (country) => country?.value === billingAddress.country_code
      )?.label || billingAddress.country_code?.toUpperCase()

    return (
      <div
        className="flex flex-col font-semibold text-laly-ink"
        data-testid="current-info"
      >
        <span>
          {billingAddress.first_name} {billingAddress.last_name}
        </span>
        {billingAddress.company && <span>{billingAddress.company}</span>}
        <span>
          {billingAddress.address_1}
          {billingAddress.address_2 ? `${t("account.list_separator")}${billingAddress.address_2}` : ""}
        </span>
        <span>
          {[
            billingAddress.city,
            billingAddress.province && governorateLabel(t, billingAddress.province),
            billingAddress.postal_code,
          ]
            .filter(Boolean)
            .join(t("account.list_separator"))}
        </span>
        <span>{country}</span>
      </div>
    )
  }, [billingAddress, regionOptions, t])

  const singleCountry = regionOptions.length === 1 ? regionOptions[0] : null

  return (
    <form action={formAction} onReset={() => clearState()} className="w-full">
      <input type="hidden" name="addressId" value={billingAddress?.id} />
      {/* Kuwait has no postal codes and the company field is not used.
          Keep any stored values so editing does not erase them. */}
      <input
        type="hidden"
        name="company"
        value={billingAddress?.company ?? ""}
      />
      <input
        type="hidden"
        name="postal_code"
        value={billingAddress?.postal_code ?? ""}
      />
      {singleCountry && (
        <input
          type="hidden"
          name="country_code"
          value={billingAddress?.country_code || singleCountry?.value || ""}
        />
      )}
      <AccountInfo
        label={t("account.billing_address")}
        currentInfo={currentInfo}
        isSuccess={successState}
        isError={!!state.error}
        clearState={clearState}
        data-testid="account-billing-address-editor"
      >
        <div className="grid grid-cols-1 gap-y-3">
          <div className="grid grid-cols-2 gap-x-2">
            <Input
              label={t("account.first_name")}
              name="first_name"
              defaultValue={billingAddress?.first_name || undefined}
              required
              data-testid="billing-first-name-input"
            />
            <Input
              label={t("account.last_name")}
              name="last_name"
              defaultValue={billingAddress?.last_name || undefined}
              required
              data-testid="billing-last-name-input"
            />
          </div>
          <KuwaitPhoneInput
            defaultValue={billingAddress?.phone ?? customer?.phone ?? ""}
            data-testid="billing-phone-input"
          />
          <GovernorateSelect
            defaultValue={billingAddress?.province}
            data-testid="billing-province-input"
          />
          <Input
            label={t("account.area")}
            name="city"
            autoComplete="address-level2"
            defaultValue={billingAddress?.city || undefined}
            required
            data-testid="billing-city-input"
          />
          <Input
            label={t("account.address_1")}
            name="address_1"
            autoComplete="address-line1"
            defaultValue={billingAddress?.address_1 || undefined}
            required
            data-testid="billing-address-1-input"
          />
          <Input
            label={t("account.address_2")}
            name="address_2"
            autoComplete="address-line2"
            defaultValue={billingAddress?.address_2 || undefined}
            data-testid="billing-address-2-input"
          />
          {!singleCountry && (
            <NativeSelect
              name="country_code"
              placeholder={t("account.country")}
              defaultValue={billingAddress?.country_code || undefined}
              required
              data-testid="billing-country-code-select"
            >
              <option value="">-</option>
              {regionOptions.map((option, i) => {
                return (
                  <option key={i} value={option?.value}>
                    {option?.label}
                  </option>
                )
              })}
            </NativeSelect>
          )}
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileBillingAddress
