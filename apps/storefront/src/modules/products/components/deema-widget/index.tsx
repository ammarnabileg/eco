"use client"

import Script from "next/script"
import { createElement, useEffect, useState } from "react"

import { useIntegrations } from "@modules/common/components/integrations/context"

const WIDGET_URLS = ["https://sandbox-widget.deema.me", "https://widget.deema.me"]

declare global {
  interface Window {
    deemaWidgetConfiguration?: { publicKey: string }
  }
}

/**
 * Deema's on-site instalment widget (required by Deema before go-live).
 * The key comes from the admin (Settings > Integrations > Deema), or from
 * NEXT_PUBLIC_DEEMA_WIDGET_KEY. The widget is a web component, so it is
 * mounted only after hydration.
 */
export default function DeemaWidget({ amount }: { amount: number }) {
  const deema = useIntegrations().deema
  const KEY = deema?.widget_key || process.env.NEXT_PUBLIC_DEEMA_WIDGET_KEY
  const configured = deema?.widget_url || process.env.NEXT_PUBLIC_DEEMA_WIDGET_URL || WIDGET_URLS[0]
  const URL = WIDGET_URLS.includes(configured) ? configured : WIDGET_URLS[0]
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (KEY) {
      window.deemaWidgetConfiguration = { publicKey: KEY }
      setMounted(true)
    }
  }, [KEY])

  if (!KEY || !mounted || !(amount > 0)) {
    return null
  }

  return (
    <>
      <Script id="deema-widget" src={URL} strategy="afterInteractive" />
      {createElement("deema-widget", {
        amount: amount.toFixed(3),
        currency: "KWD",
      })}
    </>
  )
}
