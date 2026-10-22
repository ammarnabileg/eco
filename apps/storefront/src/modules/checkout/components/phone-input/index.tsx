import { useT } from "@i18n/client"
import Input from "@modules/common/components/input"
import React, { useState } from "react"

type PhoneInputProps = Omit<React.ComponentProps<typeof Input>, "label"> & {
  label?: string
}

const PHONE_PLACEHOLDER = "+965 XXXXXXXX"

/**
 * Kuwaiti phone field. The shared Input uses a floating label that relies on
 * an empty (" ") placeholder, so the format hint is only shown while focused.
 */
const PhoneInput = ({
  label,
  onFocus,
  onBlur,
  ...props
}: PhoneInputProps) => {
  const t = useT()
  const [focused, setFocused] = useState(false)
  const placeholderProps = { placeholder: focused ? PHONE_PLACEHOLDER : " " }

  return (
    <Input
      label={label ?? t("checkout.phone")}
      type="tel"
      dir="ltr"
      inputMode="tel"
      autoComplete="tel"
      pattern="(\+?965)?\s?[0-9]{8}"
      title={t("checkout.phone_hint")}
      required
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      {...placeholderProps}
      {...props}
    />
  )
}

export default PhoneInput
