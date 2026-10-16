import Medusa from "@medusajs/js-sdk"

// Same-origin admin client using the dashboard's session cookie.
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
