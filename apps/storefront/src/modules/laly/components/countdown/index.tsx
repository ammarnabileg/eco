"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import Icon from "@modules/laly/components/icon"

const pad = (n: number) => String(n).padStart(2, "0")

function remaining(endsAt: number) {
  const ms = Math.max(0, endsAt - Date.now())
  const s = Math.floor(ms / 1000)
  return {
    ms,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

// Counts down to a real offer end date (the price list's ends_at). When it
// reaches zero the page refreshes, and the expired sale price is gone.
export default function Countdown({
  endsAt,
  variant = "dark",
  label,
}: {
  endsAt: string
  variant?: "dark" | "chip"
  label?: string
}) {
  const router = useRouter()
  const end = new Date(endsAt).getTime()
  const [left, setLeft] = useState<ReturnType<typeof remaining> | null>(null)

  useEffect(() => {
    setLeft(remaining(end))
    const timer = setInterval(() => {
      const next = remaining(end)
      setLeft(next)
      if (next.ms === 0) {
        clearInterval(timer)
        router.refresh()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [end, router])

  // Rendered only on the client to avoid a server/client time mismatch.
  if (!left || left.ms === 0) {
    return null
  }

  const time = `${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`
  const days =
    left.days > 0 ? (
      <span>{left.days === 1 ? "يوم" : left.days === 2 ? "يومين" : `${left.days} أيام`}</span>
    ) : null

  if (variant === "chip") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-laly-sand-soft text-laly-sand-d text-[11px] font-bold px-2 py-0.5">
        <Icon name="clock" size={12} />
        {days}
        <span dir="ltr" className="tabular-nums">{time}</span>
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-laly-deep text-laly-sand text-xs small:text-[13px] font-extrabold px-3 py-1.5"
      role="timer"
      aria-label={label ?? "ينتهي العرض خلال"}
    >
      <Icon name="clock" size={14} />
      {label && <span className="text-white/80 font-bold">{label}</span>}
      {days}
      <span dir="ltr" className="tabular-nums">{time}</span>
    </span>
  )
}
