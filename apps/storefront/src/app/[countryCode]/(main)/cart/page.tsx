import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getDevice } from "@lib/util/device"
import CartTemplate from "@modules/cart/templates"
import { getT } from "@i18n/server"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("cart.meta_title"), description: t("cart.meta_description") }
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const [customer, device] = await Promise.all([retrieveCustomer(), getDevice()])

  return <CartTemplate cart={cart} customer={customer} device={device} />
}
