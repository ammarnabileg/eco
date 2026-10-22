"use server"

import { getLocale } from "./server"

/** The page's language, callable from code shared by server and browser. */
export async function currentLocale() {
  return getLocale()
}
