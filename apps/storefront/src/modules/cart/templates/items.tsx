import { HttpTypes } from "@medusajs/types"

import CartLine from "@modules/cart/components/cart-line"

const ItemsTemplate = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const items = [...(cart.items ?? [])].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )
  const count = items.reduce((n, i) => n + i.quantity, 0)

  return (
    <div>
      <h1 className="text-2xl small:text-[28px] font-extrabold mb-4 flex items-baseline gap-2">
        سلة المشتريات
        <span className="text-base font-bold text-laly-mut">({count} منتج)</span>
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
