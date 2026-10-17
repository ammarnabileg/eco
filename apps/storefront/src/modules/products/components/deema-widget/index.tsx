"use client"

import Script from "next/script"
import { createElement, useEffect, useState } from "react"

const KEY = process.env.NEXT_PUBLIC_DEEMA_WIDGET_KEY
const URL = process.env.NEXT_PUBLIC_DEEMA_WIDGET_URL || "https://sandbox-widget.deema.me"

declare global {
  interface Window {
    deemaWidgetConfiguration?: { publicKey: string }
  }
}

/**
 * Deema's on-site instalment widget (required by Deema before go-live).
 * Renders nothing unless NEXT_PUBLIC_DEEMA_WIDGET_KEY is set. The widget is a
 * web component, so it is mounted only after hydration.
 */
export default function DeemaWidget({ amount }: { amount: number }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (KEY) {
      window.deemaWidgetConfiguration = { publicKey: KEY }
      setMounted(true)
    }
  }, [])

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
