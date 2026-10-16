import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const values = (option.values ?? []).map((v) => v.value)

  return (
    <fieldset className="flex flex-col gap-y-2.5">
      <legend className="text-sm font-bold mb-2.5">
        {title}
        {current && <span className="font-normal text-laly-mut">: {current}</span>}
      </legend>
      <div className="flex flex-wrap gap-2" data-testid={dataTestId}>
        {values.map((v) => (
          <button
            type="button"
            onClick={() => updateOption(option.id, v)}
            key={v}
            aria-pressed={v === current}
            className={clx(
              "min-w-[64px] h-10 px-4 rounded-btn border-[1.6px] text-sm font-bold transition-colors",
              v === current
                ? "border-laly-teal bg-laly-teal-faint text-laly-teal"
                : "border-laly-line bg-white hover:border-laly-teal"
            )}
            disabled={disabled}
            data-testid="option-button"
          >
            {v}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default OptionSelect
