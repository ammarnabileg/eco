"use client"

import NativeSelect from "@modules/common/components/native-select"
import { useId } from "react"

// Kuwait governorates. The Arabic name is stored as the address `province`.
export const KUWAIT_GOVERNORATES = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "مبارك الكبير",
  "الأحمدي",
  "الجهراء",
] as const

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
  const hasLegacyValue =
    !!defaultValue &&
    !(KUWAIT_GOVERNORATES as readonly string[]).includes(defaultValue)

  return (
    <div className="flex flex-col w-full gap-y-1">
      <label htmlFor={id} className="txt-compact-small text-laly-mut">
        المحافظة
        {required && <span className="text-rose-500">*</span>}
      </label>
      <NativeSelect
        id={id}
        name="province"
        placeholder="اختر المحافظة"
        autoComplete="address-level1"
        defaultValue={defaultValue || ""}
        required={required}
        data-testid={dataTestId}
      >
        {hasLegacyValue && <option value={defaultValue!}>{defaultValue}</option>}
        {KUWAIT_GOVERNORATES.map((governorate) => (
          <option key={governorate} value={governorate}>
            {governorate}
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

  return (
    <div className="flex flex-col w-full gap-y-1">
      <label htmlFor={id} className="txt-compact-small text-laly-mut">
        رقم الهاتف
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
        className="block w-full h-11 px-4 txt-compact-medium text-end bg-ui-bg-field border border-ui-border-base rounded-md appearance-none placeholder:text-laly-faint focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active hover:bg-ui-bg-field-hover"
        data-testid={dataTestId}
      />
    </div>
  )
}
