"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@modules/common/components/ui"
import { confirmEmailVerification } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useT } from "@i18n/client"

type VerificationState = "verifying" | "success" | "error"

const VerifyAccount = () => {
  const t = useT()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<VerificationState>("verifying")
  // Guard against the effect running twice in React Strict Mode, which would
  // consume the single-use token before the customer sees the result.
  const confirmed = useRef(false)

  useEffect(() => {
    if (confirmed.current) {
      return
    }
    confirmed.current = true

    if (!token) {
      setState("error")
      return
    }

    confirmEmailVerification(token).then(({ success }) =>
      setState(success ? "success" : "error")
    )
  }, [token])

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center text-center gap-y-4 bg-white border border-laly-line rounded-card shadow-laly p-6 small:p-8"
      data-testid="verify-account-page"
    >
      <h1 className="text-2xl font-bold text-laly-ink">
        {t("account.verify_title")}
      </h1>

      {state === "verifying" && (
        <p className="text-base-regular text-laly-mut">
          {t("account.verifying")}
        </p>
      )}

      {state === "success" && (
        <>
          <p className="text-base-regular text-laly-mut">
            {t("account.verify_success")}
          </p>
          <LocalizedClientLink href="/account">
            <Button variant="primary">{t("account.go_to_sign_in")}</Button>
          </LocalizedClientLink>
        </>
      )}

      {state === "error" && (
        <>
          <p className="text-base-regular text-laly-mut">
            {t("account.verify_error")}
          </p>
          <LocalizedClientLink href="/account">
            <Button variant="secondary">{t("account.go_to_sign_in")}</Button>
          </LocalizedClientLink>
        </>
      )}
    </div>
  )
}

export default VerifyAccount
