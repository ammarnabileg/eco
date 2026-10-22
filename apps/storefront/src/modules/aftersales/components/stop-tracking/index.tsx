"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { stopTracking } from "@lib/data/aftersales"

// Forgets the verified order (clears the tracking cookie) and reloads the page.
export default function StopTracking({ label }: { label: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await stopTracking()
          router.refresh()
        })
      }
      className="text-[13.5px] font-bold text-laly-teal underline underline-offset-4 disabled:opacity-60"
    >
      {label}
    </button>
  )
}
