"use client"

import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { PencilSquare as Edit, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import CountrySelect from "@modules/checkout/components/country-select"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import {
  GovernorateSelect,
  KuwaitPhoneInput,
} from "@modules/account/components/kuwait-address-fields"
import { Button, Heading, Text, clx } from "@modules/common/components/ui"
import Spinner from "@modules/common/icons/spinner"
import React, { useActionState, useEffect, useState } from "react"

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
}

const EditAddress: React.FC<EditAddressProps> = ({
  region,
  address,
  isActive = false,
}) => {
  const [removing, setRemoving] = useState(false)
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(updateCustomerAddress, {
    success: false,
    error: null,
  } as { success: boolean; error: string | null })

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  const removeAddress = async () => {
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  const countries = region.countries ?? []
  const singleCountry = countries.length === 1 ? countries[0] : null
  const countryName =
    countries.find((c) => c.iso_2 === address.country_code)?.display_name ||
    address.country_code?.toUpperCase()

  return (
    <>
      <div
        className={clx(
          "bg-white border border-laly-line rounded-card p-5 min-h-[220px] h-full w-full flex flex-col justify-between transition-colors",
          {
            "border-laly-teal": isActive,
          }
        )}
        data-testid="address-container"
      >
        <div className="flex flex-col">
          <Heading
            className="text-start text-base-semi text-laly-ink"
            data-testid="address-name"
          >
            {address.first_name} {address.last_name}
          </Heading>
          {address.company && (
            <Text
              className="txt-compact-small text-laly-mut"
              data-testid="address-company"
            >
              {address.company}
            </Text>
          )}
          <Text className="flex flex-col text-start text-base-regular text-laly-mut mt-2 gap-y-0.5">
            <span data-testid="address-address">
              {address.address_1}
              {address.address_2 && <span>، {address.address_2}</span>}
            </span>
            <span data-testid="address-postal-city">
              {[address.city, address.postal_code].filter(Boolean).join("، ")}
            </span>
            <span data-testid="address-province-country">
              {address.province && `${address.province}، `}
              {countryName}
            </span>
            {address.phone && (
              <span dir="ltr" className="text-end">
                {address.phone}
              </span>
            )}
          </Text>
        </div>
        <div className="flex items-center gap-x-4 mt-4">
          <button
            className="text-small-regular text-laly-teal hover:text-laly-teal-d font-semibold flex items-center gap-x-2"
            onClick={open}
            data-testid="address-edit-button"
          >
            <Edit />
            تعديل
          </button>
          <button
            className="text-small-regular text-laly-mut hover:text-laly-red flex items-center gap-x-2"
            onClick={removeAddress}
            data-testid="address-delete-button"
          >
            {removing ? <Spinner /> : <Trash />}
            حذف
          </button>
        </div>
      </div>

      <Modal isOpen={state} close={close} data-testid="edit-address-modal">
        <Modal.Title>
          <Heading className="mb-2 text-laly-ink">تعديل العنوان</Heading>
        </Modal.Title>
        <form action={formAction}>
          <input type="hidden" name="addressId" value={address.id} />
          {/* Kuwait has no postal codes and the company field is not used.
              Keep any stored values so editing does not erase them. */}
          <input type="hidden" name="company" value={address.company ?? ""} />
          <input
            type="hidden"
            name="postal_code"
            value={address.postal_code ?? ""}
          />
          {singleCountry && (
            <input
              type="hidden"
              name="country_code"
              value={address.country_code || singleCountry.iso_2 || ""}
            />
          )}
          <Modal.Body>
            <div className="grid grid-cols-1 gap-y-3">
              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label="الاسم الأول"
                  name="first_name"
                  required
                  autoComplete="given-name"
                  defaultValue={address.first_name || undefined}
                  data-testid="first-name-input"
                />
                <Input
                  label="اسم العائلة"
                  name="last_name"
                  required
                  autoComplete="family-name"
                  defaultValue={address.last_name || undefined}
                  data-testid="last-name-input"
                />
              </div>
              <GovernorateSelect
                defaultValue={address.province}
                data-testid="state-input"
              />
              <Input
                label="المنطقة"
                name="city"
                required
                autoComplete="address-level2"
                defaultValue={address.city || undefined}
                data-testid="city-input"
              />
              <Input
                label="القطعة، الشارع، الجادة"
                name="address_1"
                required
                autoComplete="address-line1"
                defaultValue={address.address_1 || undefined}
                data-testid="address-1-input"
              />
              <Input
                label="المبنى، الدور، الشقة (اختياري)"
                name="address_2"
                autoComplete="address-line2"
                defaultValue={address.address_2 || undefined}
                data-testid="address-2-input"
              />
              {!singleCountry && (
                <CountrySelect
                  name="country_code"
                  region={region}
                  placeholder="الدولة"
                  required
                  autoComplete="country"
                  defaultValue={address.country_code || undefined}
                  data-testid="country-select"
                />
              )}
              <KuwaitPhoneInput
                defaultValue={address.phone}
                data-testid="phone-input"
              />
            </div>
            {formState.error && (
              <div className="text-rose-500 text-small-regular py-2">
                {formState.error}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6">
              <Button
                type="reset"
                variant="secondary"
                onClick={close}
                className="h-10"
                data-testid="cancel-button"
              >
                إلغاء
              </Button>
              <SubmitButton data-testid="save-button">حفظ</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default EditAddress
