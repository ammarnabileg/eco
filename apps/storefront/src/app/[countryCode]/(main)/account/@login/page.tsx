import { Metadata } from "next"

import { getPublicIntegrations } from "@lib/data/integrations"
import LoginTemplate from "@modules/account/templates/login-template"
import { getT } from "@i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: t("account.sign_in"),
    description: t("account.meta_login_description"),
  }
}

export default async function Login() {
  const { whatsapp } = await getPublicIntegrations()
  return <LoginTemplate whatsappWelcome={whatsapp?.welcome === "on"} />
}
