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
  label = "رقم الهاتف",
  onFocus,
  onBlur,
  ...props
}: PhoneInputProps) => {
  const [focused, setFocused] = useState(false)
  const placeholderProps = { placeholder: focused ? PHONE_PLACEHOLDER : " " }

  return (
    <Input
      label={label}
      type="tel"
      dir="ltr"
      inputMode="tel"
      autoComplete="tel"
      pattern="(\+?965)?\s?[0-9]{8}"
      title="أدخل رقم هاتف كويتي من 8 أرقام، مثل +965 XXXXXXXX"
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
