import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getDevice } from "@lib/util/device"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "السلة",
  description: "راجع المنتجات في سلتك وأكمل طلبك.",
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const [customer, device] = await Promise.all([retrieveCustomer(), getDevice()])

  return <CartTemplate cart={cart} customer={customer} device={device} />
}
