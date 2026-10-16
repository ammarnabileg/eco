import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

const EmptyCartMessage = () => (
  <div className="py-20 small:py-32 flex flex-col items-center text-center gap-4" data-testid="empty-cart-message">
    <span className="w-20 h-20 rounded-full bg-laly-teal-soft text-laly-teal flex items-center justify-center">
      <Icon name="cart" size={36} />
    </span>
    <h1 className="text-2xl font-extrabold">سلتك فاضية</h1>
    <p className="text-laly-mut max-w-sm">
      ما أضفت أي منتج للحين. تصفح الأقسام والعروض واختار اللي يناسبك.
    </p>
    <div className="flex gap-3 mt-2">
      <LocalizedClientLink href="/store" className="rounded-btn bg-laly-teal hover:bg-laly-teal-d text-white font-bold px-6 py-3">
        تصفح المنتجات
      </LocalizedClientLink>
      <LocalizedClientLink href="/offers" className="rounded-btn border-[1.6px] border-laly-teal text-laly-teal font-bold px-6 py-3">
        العروض
      </LocalizedClientLink>
    </div>
  </div>
)

export default EmptyCartMessage
