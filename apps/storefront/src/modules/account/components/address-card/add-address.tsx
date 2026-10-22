"use client"

import { Plus } from "@medusajs/icons"
import { Button, Heading } from "@modules/common/components/ui"
import { useActionState, useEffect, useState } from "react"

import { addCustomerAddress } from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { HttpTypes } from "@medusajs/types"
import CountrySelect from "@modules/checkout/components/country-select"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import {
  GovernorateSelect,
  KuwaitPhoneInput,
} from "@modules/account/components/kuwait-address-fields"
import { useT } from "@i18n/client"

const AddAddress = ({
  region,
}: {
  region: HttpTypes.StoreRegion
  addresses: HttpTypes.StoreCustomerAddress[]
}) => {
  const t = useT()
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(addCustomerAddress, {
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

  const countries = region.countries ?? []
  const singleCountry = countries.length === 1 ? countries[0] : null

  return (
    <>
      <button
        className="group bg-white border border-dashed border-laly-line hover:border-laly-teal hover:bg-laly-teal-faint rounded-card p-5 min-h-[220px] h-full w-full flex flex-col justify-between text-start transition-colors"
        onClick={open}
        data-testid="add-address-button"
      >
        <span className="text-base-semi text-laly-ink">{t("account.add_new_address")}</span>
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-laly-teal-soft text-laly-teal group-hover:bg-laly-teal group-hover:text-white transition-colors">
          <Plus />
        </span>
      </button>

      <Modal isOpen={state} close={close} data-testid="add-address-modal">
        <Modal.Title>
          <Heading className="mb-2 text-laly-ink">{t("account.add_address")}</Heading>
        </Modal.Title>
        <form action={formAction}>
          {/* Kuwait has no postal codes and the company field is not used. */}
          <input type="hidden" name="company" value="" />
          <input type="hidden" name="postal_code" value="" />
          {singleCountry && (
            <input
              type="hidden"
              name="country_code"
              value={singleCountry.iso_2 ?? ""}
            />
          )}
          <Modal.Body>
            <div className="flex flex-col gap-y-3">
              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label={t("account.first_name")}
                  name="first_name"
                  required
                  autoComplete="given-name"
                  data-testid="first-name-input"
                />
                <Input
                  label={t("account.last_name")}
                  name="last_name"
                  required
                  autoComplete="family-name"
                  data-testid="last-name-input"
                />
              </div>
              <GovernorateSelect data-testid="state-input" />
              <Input
                label={t("account.area")}
                name="city"
                required
                autoComplete="address-level2"
                data-testid="city-input"
              />
              <Input
                label={t("account.address_1")}
                name="address_1"
                required
                autoComplete="address-line1"
                data-testid="address-1-input"
              />
              <Input
                label={t("account.address_2")}
                name="address_2"
                autoComplete="address-line2"
                data-testid="address-2-input"
              />
              {!singleCountry && (
                <CountrySelect
                  region={region}
                  name="country_code"
                  placeholder={t("account.country")}
                  required
                  autoComplete="country"
                  data-testid="country-select"
                />
              )}
              <KuwaitPhoneInput data-testid="phone-input" />
            </div>
            {formState.error && (
              <div
                className="text-rose-500 text-small-regular py-2"
                data-testid="address-error"
              >
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
                {t("account.cancel")}
              </Button>
              <SubmitButton data-testid="save-button">{t("account.save")}</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default AddAddress
