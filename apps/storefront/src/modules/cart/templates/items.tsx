import { getT } from "@i18n/server"
import { HttpTypes } from "@medusajs/types"

import CartLine from "@modules/cart/components/cart-line"

const ItemsTemplate = async ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const t = await getT()
  const items = [...(cart.items ?? [])].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )
  const count = items.reduce((n, i) => n + i.quantity, 0)

  return (
    <div>
      <h1 className="text-2xl small:text-[28px] font-extrabold mb-4 flex items-baseline gap-2">
        {t("cart.title")}
        <span className="text-base font-bold text-laly-mut">
          {count === 1 ? t("cart.item_count_one") : t("cart.item_count", { count })}
        </span>
      </h1>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <CartLine key={item.id} item={item} currencyCode={cart.currency_code} />
        ))}
      </ul>
    </div>
  )
}

export default ItemsTemplate
