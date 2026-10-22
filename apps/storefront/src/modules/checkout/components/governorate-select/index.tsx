import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select"
import { useT } from "@i18n/client"
import { forwardRef } from "react"

// The stored values stay Arabic (saved addresses and the backend use them);
// only the visible label is translated.
export const KUWAIT_GOVERNORATES = [
  "العاصمة",
  "حولي",
  "الفروانية",
  "مبارك الكبير",
  "الأحمدي",
  "الجهراء",
] as const

const LABEL_KEYS: Record<(typeof KUWAIT_GOVERNORATES)[number], string> = {
  "العاصمة": "checkout.governorate_capital",
  "حولي": "checkout.governorate_hawalli",
  "الفروانية": "checkout.governorate_farwaniya",
  "مبارك الكبير": "checkout.governorate_mubarak_al_kabeer",
  "الأحمدي": "checkout.governorate_ahmadi",
  "الجهراء": "checkout.governorate_jahra",
}

/**
 * Kuwait governorate picker, stored in Medusa's `province` field.
 * The Arabic name is the stored value.
 */
const GovernorateSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ placeholder, value, ...props }, ref) => {
    const t = useT()
    const current = typeof value === "string" ? value : ""
    // Keep a legacy value (e.g. an older English province) selectable so it
    // isn't silently dropped from a saved address.
    const hasLegacyValue =
      current !== "" &&
      !(KUWAIT_GOVERNORATES as readonly string[]).includes(current)

    return (
      <NativeSelect
        ref={ref}
        placeholder={placeholder ?? t("checkout.governorate")}
        aria-label={t("checkout.governorate")}
        value={value}
        {...props}
      >
        {hasLegacyValue && <option value={current}>{current}</option>}
        {KUWAIT_GOVERNORATES.map((name) => (
          <option key={name} value={name}>
            {t(LABEL_KEYS[name])}
          </option>
        ))}
      </NativeSelect>
    )
  }
)

GovernorateSelect.displayName = "GovernorateSelect"

export default GovernorateSelect
