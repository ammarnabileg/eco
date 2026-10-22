import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"
import { useT } from "@i18n/client"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)
  const t = useT()
  const [sentBefore, sentAfter = ""] = t("account.login_verification_sent").split("{email}")

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center bg-white border border-laly-line rounded-card shadow-laly p-6 small:p-8"
      data-testid="login-page"
    >
      <h1 className="text-2xl font-bold text-laly-ink mb-2">{t("account.login_title")}</h1>
      <p className="text-center text-base-regular text-laly-mut mb-8">
        {t("account.login_intro")}
      </p>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-6 text-center text-base-regular text-laly-ink bg-laly-teal-faint border border-laly-teal-soft rounded-btn p-4"
          data-testid="login-verification-message"
        >
          {sentBefore}
          <strong dir="ltr">{message.email}</strong>
          {sentAfter}
        </div>
      )}
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t("account.email")}
            name="email"
            type="email"
            dir="ltr"
            title={t("account.email_invalid")}
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label={t("account.password")}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6">
          {t("account.sign_in")}
        </SubmitButton>
      </form>
      <span className="text-center text-laly-mut text-small-regular mt-6">
        {t("account.no_account")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="font-semibold text-laly-teal underline hover:text-laly-teal-d"
          data-testid="register-button"
        >
          {t("account.create_account")}
        </button>
      </span>
    </div>
  )
}

export default Login
