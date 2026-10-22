"use client"
import { createTransferRequest } from "@lib/data/orders"
import { CheckCircleMiniSolid, XCircleSolid } from "@medusajs/icons"
import { Heading, IconButton, Input, Text } from "@modules/common/components/ui"
import { useActionState } from "react"
// TODO: Re-add Toaster component when needed
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useEffect, useState } from "react"
import { useT } from "@i18n/client"

export default function TransferRequestForm() {
  const t = useT()
  const [showSuccess, setShowSuccess] = useState(false)
  const [requestedBefore, requestedAfter = ""] = t("account.transfer_requested").split("{id}")
  const [sentBefore, sentAfter = ""] = t("account.transfer_email_sent").split("{email}")

  const [state, formAction] = useActionState(createTransferRequest, {
    success: false,
    error: null,
    order: null,
  })

  useEffect(() => {
    if (state.success && state.order) {
      setShowSuccess(true)
    }
  }, [state.success, state.order])

  return (
    <div className="flex flex-col gap-y-4 w-full">
      <div className="grid sm:grid-cols-2 items-center gap-x-8 gap-y-4 w-full">
        <div className="flex flex-col gap-y-1">
          <Heading level="h3" className="!text-sm font-semibold text-laly-ink">
            {t("account.transfer_title")}
          </Heading>
          <p className="text-small-regular text-laly-mut">
            {t("account.transfer_question")}
            <br /> {t("account.transfer_hint")}
          </p>
        </div>
        <form
          action={formAction}
          className="flex flex-col gap-y-1 sm:items-end"
        >
          <div className="flex flex-col gap-y-2 w-full">
            <Input
              className="w-full"
              name="order_id"
              placeholder={t("account.transfer_order_id")}
              aria-label={t("account.transfer_order_id")}
            />
            <SubmitButton
              variant="secondary"
              size="small"
              className="w-fit whitespace-nowrap self-end"
            >
              {t("account.transfer_submit")}
            </SubmitButton>
          </div>
        </form>
      </div>
      {!state.success && state.error && (
        <Text className="text-base-regular text-rose-500 text-end">
          {state.error}
        </Text>
      )}
      {showSuccess && (
        <div className="flex justify-between p-4 bg-laly-teal-faint border border-laly-teal-soft rounded-card w-full self-stretch items-center">
          <div className="flex gap-x-2 items-center">
            <CheckCircleMiniSolid className="w-4 h-4 text-emerald-500" />
            <div className="flex flex-col gap-y-1">
              <Text className="text-medim-pl text-laly-ink">
                {requestedBefore}
                <span dir="ltr">{state.order?.id}</span>
                {requestedAfter}
              </Text>
              <Text className="text-base-regular text-laly-mut">
                {sentBefore}
                <span dir="ltr">{state.order?.email}</span>
                {sentAfter}
              </Text>
            </div>
          </div>
          <IconButton
            className="h-fit"
            onClick={() => setShowSuccess(false)}
            aria-label={t("account.close")}
          >
            <XCircleSolid className="w-4 h-4 text-neutral-500" />
          </IconButton>
        </div>
      )}
    </div>
  )
}
