import { Metadata } from "next"

import { getPublicIntegrations } from "@lib/data/integrations"
import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل الدخول إلى حسابك في Laly.",
}

export default async function Login() {
  const { whatsapp } = await getPublicIntegrations()
  return <LoginTemplate whatsappWelcome={whatsapp?.welcome === "on"} />
}
