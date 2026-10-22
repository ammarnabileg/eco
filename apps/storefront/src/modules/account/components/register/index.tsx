"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import { useT } from "@i18n/client"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  whatsappWelcome?: boolean
}

const Register = ({ setCurrentView, whatsappWelcome = false }: Props) => {
  const [message, formAction] = useActionState(signup, null)
  const t = useT()
  const [sentBefore, sentAfter = ""] = t("account.register_verification_sent").split("{email}")
  // "...agree to the {privacy} and {terms}." with the two names as links.
  const terms = t("account.register_terms").split(/(\{privacy\}|\{terms\})/)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center bg-white border border-laly-line rounded-card shadow-laly p-6 small:p-8"
      data-testid="register-page"
    >
      <h1 className="text-2xl font-bold text-laly-ink mb-2">{t("account.create_account")}</h1>
      <p className="text-center text-base-regular text-laly-mut mb-6">
        {t("account.register_intro")}
      </p>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-4 text-center text-base-regular text-laly-ink bg-laly-teal-faint border border-laly-teal-soft rounded-btn p-4"
          data-testid="register-verification-message"
        >
          {sentBefore}
          <strong dir="ltr">{message.email}</strong>
          {sentAfter}
        </div>
      )}
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
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
          <Input
            label={t("account.email")}
            name="email"
            required
            type="email"
            dir="ltr"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label={t("account.phone")}
            name="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel"
            data-testid="phone-input"
          />
          {whatsappWelcome && (
            <p className="-mt-1 text-xs text-laly-mut">
              {t("account.whatsapp_hint")}
            </p>
          )}
          <Input
            label={t("account.password")}
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <span className="text-center text-laly-mut text-small-regular mt-6">
          {terms.map((part, i) =>
            part === "{privacy}" ? (
              <LocalizedClientLink
                key={i}
                href="/content/privacy-policy"
                className="underline text-laly-teal"
              >
                {t("account.privacy_policy")}
              </LocalizedClientLink>
            ) : part === "{terms}" ? (
              <LocalizedClientLink
                key={i}
                href="/content/terms-of-use"
                className="underline text-laly-teal"
              >
                {t("account.terms_of_use")}
              </LocalizedClientLink>
            ) : (
              part
            )
          )}
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          {t("account.create_account")}
        </SubmitButton>
      </form>
      <span className="text-center text-laly-mut text-small-regular mt-6">
        {t("account.have_account")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="font-semibold text-laly-teal underline hover:text-laly-teal-d"
        >
          {t("account.sign_in")}
        </button>
      </span>
    </div>
  )
}

export default Register
