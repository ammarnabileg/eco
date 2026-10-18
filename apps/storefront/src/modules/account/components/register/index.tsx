"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  whatsappWelcome?: boolean
}

const Register = ({ setCurrentView, whatsappWelcome = false }: Props) => {
  const [message, formAction] = useActionState(signup, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center bg-white border border-laly-line rounded-card shadow-laly p-6 small:p-8"
      data-testid="register-page"
    >
      <h1 className="text-2xl font-bold text-laly-ink mb-2">إنشاء حساب</h1>
      <p className="text-center text-base-regular text-laly-mut mb-6">
        أنشئ حسابك لمتابعة طلباتك وحفظ عناوينك والاستمتاع بتجربة تسوق أسهل.
      </p>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-4 text-center text-base-regular text-laly-ink bg-laly-teal-faint border border-laly-teal-soft rounded-btn p-4"
          data-testid="register-verification-message"
        >
          أرسلنا رابط التحقق إلى{" "}
          <strong dir="ltr">{message.email}</strong>. يرجى مراجعة بريدك
          الوارد لتأكيد بريدك الإلكتروني، ثم تسجيل الدخول.
        </div>
      )}
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="الاسم الأول"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="اسم العائلة"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label="البريد الإلكتروني"
            name="email"
            required
            type="email"
            dir="ltr"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="رقم الهاتف"
            name="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel"
            data-testid="phone-input"
          />
          {whatsappWelcome && (
            <p className="-mt-1 text-xs text-laly-mut">
              اكتب رقم الواتساب علشان توصلك رسالة الترحيب وتفاصيل طلباتك.
            </p>
          )}
          <Input
            label="كلمة المرور"
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
          بإنشاء حساب، فإنك توافق على{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline text-laly-teal"
          >
            سياسة الخصوصية
          </LocalizedClientLink>{" "}
          و
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline text-laly-teal"
          >
            شروط الاستخدام
          </LocalizedClientLink>
          .
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          إنشاء حساب
        </SubmitButton>
      </form>
      <span className="text-center text-laly-mut text-small-regular mt-6">
        لديك حساب بالفعل؟{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="font-semibold text-laly-teal underline hover:text-laly-teal-d"
        >
          تسجيل الدخول
        </button>
      </span>
    </div>
  )
}

export default Register
