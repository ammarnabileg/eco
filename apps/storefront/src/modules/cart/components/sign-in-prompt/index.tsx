import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

const SignInPrompt = () => (
  <div className="bg-laly-teal-faint border border-laly-teal-soft rounded-card p-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-full bg-white text-laly-teal flex items-center justify-center shrink-0">
        <Icon name="user" size={20} />
      </span>
      <div>
        <p className="text-sm font-bold">عندك حساب؟</p>
        <p className="text-xs text-laly-mut">سجّل دخولك لتتابع طلباتك وتحفظ عناوينك.</p>
      </div>
    </div>
    <LocalizedClientLink
      href="/account"
      className="shrink-0 rounded-btn border-[1.6px] border-laly-teal text-laly-teal text-sm font-bold px-4 py-2 hover:bg-white"
      data-testid="sign-in-button"
    >
      تسجيل الدخول
    </LocalizedClientLink>
  </div>
)

export default SignInPrompt
