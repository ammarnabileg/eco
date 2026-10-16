import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center bg-white border border-laly-line rounded-card shadow-laly p-6 small:p-8"
      data-testid="login-page"
    >
      <h1 className="text-2xl font-bold text-laly-ink mb-2">أهلاً بعودتك</h1>
      <p className="text-center text-base-regular text-laly-mut mb-8">
        سجّل الدخول لمتابعة طلباتك والتسوق بشكل أسرع.
      </p>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-6 text-center text-base-regular text-laly-ink bg-laly-teal-faint border border-laly-teal-soft rounded-btn p-4"
          data-testid="login-verification-message"
        >
          أرسلنا رابط التحقق إلى{" "}
          <strong dir="ltr">{message.email}</strong>. يرجى تأكيد بريدك
          الإلكتروني ثم تسجيل الدخول.
        </div>
      )}
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="البريد الإلكتروني"
            name="email"
            type="email"
            dir="ltr"
            title="أدخل بريدًا إلكترونيًا صحيحًا."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="كلمة المرور"
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
          تسجيل الدخول
        </SubmitButton>
      </form>
      <span className="text-center text-laly-mut text-small-regular mt-6">
        ليس لديك حساب؟{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="font-semibold text-laly-teal underline hover:text-laly-teal-d"
          data-testid="register-button"
        >
          إنشاء حساب
        </button>
      </span>
    </div>
  )
}

export default Login
