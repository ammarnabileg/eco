import type { Locale } from "../config"
import type { Messages } from "../translate"

// Messages are grouped by namespace: one JSON file per area of the store.
// Every language has the same files; a new namespace is added to each.
import arLayout from "./ar/layout.json"
import arHome from "./ar/home.json"
import arCatalog from "./ar/catalog.json"
import arPages from "./ar/pages.json"
import arProduct from "./ar/product.json"
import arCart from "./ar/cart.json"
import arCheckout from "./ar/checkout.json"
import arOrder from "./ar/order.json"
import arAccount from "./ar/account.json"
import arService from "./ar/service.json"
import arAftersales from "./ar/aftersales.json"
import arTools from "./ar/tools.json"
import enLayout from "./en/layout.json"
import enHome from "./en/home.json"
import enCatalog from "./en/catalog.json"
import enPages from "./en/pages.json"
import enProduct from "./en/product.json"
import enCart from "./en/cart.json"
import enCheckout from "./en/checkout.json"
import enOrder from "./en/order.json"
import enAccount from "./en/account.json"
import enService from "./en/service.json"
import enAftersales from "./en/aftersales.json"
import enTools from "./en/tools.json"

export const MESSAGES: Record<Locale, Messages> = {
  ar: { layout: arLayout, home: arHome, catalog: arCatalog, pages: arPages, product: arProduct, cart: arCart, checkout: arCheckout, order: arOrder, account: arAccount, service: arService, aftersales: arAftersales, tools: arTools },
  en: { layout: enLayout, home: enHome, catalog: enCatalog, pages: enPages, product: enProduct, cart: enCart, checkout: enCheckout, order: enOrder, account: enAccount, service: enService, aftersales: enAftersales, tools: enTools },
}
