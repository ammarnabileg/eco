import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select"
import { forwardRef } from "react"

export const KUWAIT_GOVERNORATES = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "مبارك الكبير",
  "الأحمدي",
  "الجهراء",
] as const

/**
 * Kuwait governorate picker, stored in Medusa's `province` field.
 * The Arabic name is the stored value.
 */
const GovernorateSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ placeholder = "المحافظة", value, ...props }, ref) => {
    const current = typeof value === "string" ? value : ""
    // Keep a legacy value (e.g. an older English province) selectable so it
    // isn't silently dropped from a saved address.
    const hasLegacyValue =
      current !== "" &&
      !(KUWAIT_GOVERNORATES as readonly string[]).includes(current)

    return (
      <NativeSelect
        ref={ref}
        placeholder={placeholder}
        aria-label="المحافظة"
        value={value}
        {...props}
      >
        {hasLegacyValue && <option value={current}>{current}</option>}
        {KUWAIT_GOVERNORATES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </NativeSelect>
    )
  }
)

GovernorateSelect.displayName = "GovernorateSelect"

export default GovernorateSelect
