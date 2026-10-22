"use client"

import { useT } from "@i18n/client"

/** The Button's loading text. A client component, so Button stays usable from server components. */
export default function LoadingLabel() {
  const t = useT()
  return <>{t("layout.loading")}</>
}
