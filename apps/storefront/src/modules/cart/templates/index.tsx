import { HttpTypes } from "@medusajs/types"

import type { Device } from "@lib/util/device"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import ItemsTemplate from "./items"
import Summary from "./summary"

const CartTemplate = ({
  cart,
  customer,
  device,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  device: Device
}) => (
  <div className={`py-6 small:py-10 ${device === "mobile" ? "pb-28" : ""}`}>
    <div className="content-container" data-testid="cart-container">
      {cart?.items?.length ? (
        <div className="grid grid-cols-1 small:grid-cols-[1fr_380px] gap-6 small:gap-8 items-start">
          <div className="flex flex-col gap-4">
            {!customer && <SignInPrompt />}
            <ItemsTemplate cart={cart} />
          </div>
          {cart.region && (
            <div className="small:sticky small:top-28">
              <Summary cart={cart} layout={device} />
            </div>
          )}
        </div>
      ) : (
        <EmptyCartMessage />
      )}
    </div>
  </div>
)

export default CartTemplate
