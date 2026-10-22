"use client"

import { useT } from "@i18n/client"
import type { Translate } from "@i18n/translate"
import NativeSelect from "@modules/common/components/native-select"
import { useId } from "react"

// Kuwait governorates. The Arabic name is stored as the address `province`
// (data, not display text); the label shown comes from the translation key.
export const KUWAIT_GOVERNORATES = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "مبارك الكبير",
  "الأحمدي",
  "الجهراء",
] as const

const GOVERNORATE_KEYS = [
  "account.gov_capital",
  "account.gov_hawalli",
  "account.gov_farwaniya",
  "account.gov_mubarak_al_kabeer",
  "account.gov_ahmadi",
  "account.gov_jahra",
]

/** The stored (Arabic) governorate in the visitor's language; other values as stored. */
export const governorateLabel = (t: Translate, value: string) => {
  const i = (KUWAIT_GOVERNORATES as readonly string[]).indexOf(value)
  return i === -1 ? value : t(GOVERNORATE_KEYS[i])
}

type GovernorateSelectProps = {
  defaultValue?: string | null
  required?: boolean
  "data-testid"?: string
}

export const GovernorateSelect = ({
  defaultValue,
  required = true,
  "data-testid": dataTestId,
}: GovernorateSelectProps) => {
  const id = useId()
  const t = useT()
  const hasLegacyValue =
    !!defaultValue &&
    !(KUWAIT_GOVERNORATES as readonly string[]).includes(defaultValue)

  return (
    <div className="flex flex-col w-full gap-y-1">
      <label htmlFor={id} className="txt-compact-small text-laly-mut">
        {t("account.governorate")}
        {required && <span className="text-rose-500">*</span>}
      </label>
      <NativeSelect
        id={id}
        name="province"
        placeholder={t("account.choose_governorate")}
        autoComplete="address-level1"
        defaultValue={defaultValue || ""}
        required={required}
        data-testid={dataTestId}
      >
        {hasLegacyValue && <option value={defaultValue!}>{defaultValue}</option>}
        {KUWAIT_GOVERNORATES.map((governorate) => (
          <option key={governorate} value={governorate}>
            {governorateLabel(t, governorate)}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

type KuwaitPhoneInputProps = {
  name?: string
  defaultValue?: string | null
  required?: boolean
  "data-testid"?: string
}

export const KuwaitPhoneInput = ({
  name = "phone",
  defaultValue,
  required = true,
  "data-testid": dataTestId,
}: KuwaitPhoneInputProps) => {
  const id = useId()
  const t = useT()

  return (
    <div className="flex flex-col w-full gap-y-1">
      <label htmlFor={id} className="txt-compact-small text-laly-mut">
        {t("account.phone")}
        {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        dir="ltr"
        autoComplete="tel"
        placeholder="+965 XXXXXXXX"
        required={required}
        defaultValue={defaultValue || undefined}
        className="block w-full h-11 px-4 txt-compact-medium rtl:text-end bg-ui-bg-field border border-ui-border-base rounded-md appearance-none placeholder:text-laly-faint focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active hover:bg-ui-bg-field-hover"
        data-testid={dataTestId}
      />
    </div>
  )
}
