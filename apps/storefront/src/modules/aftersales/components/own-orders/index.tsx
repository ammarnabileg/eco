"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { useT } from "@i18n/client"
import { startTracking } from "@lib/data/aftersales"

export type OwnOrder = { display_id: number; date: string; total: string }

// A signed-in customer's orders: choosing one opens it without a WhatsApp code
// (the backend checks that the order is theirs).
export default function OwnOrders({ orders }: { orders: OwnOrder[] }) {
  const t = useT()
  const router = useRouter()
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!orders.length) return <p className="text-laly-mut">{t("aftersales.no_orders")}</p>

  return (
    <div className="grid gap-2">
      {orders.map((o) => (
        <button
          key={o.display_id}
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            setBusy(o.display_id)
            setError(null)
            const res = await startTracking({ display_id: String(o.display_id) })
            setBusy(null)
            if (res.ok && res.status === "verified") router.refresh()
            else setError(res.ok ? t("aftersales.error_generic") : res.error)
          }}
          className="flex items-center justify-between gap-3 rounded-btn border border-laly-line bg-white px-4 py-3 text-start hover:border-laly-teal disabled:opacity-60"
        >
          <span>
            <span className="block font-bold text-laly-ink">{t("aftersales.order_line", { id: o.display_id, date: o.date })}</span>
            <span className="block text-[13px] text-laly-mut">{o.total}</span>
          </span>
          <span className="text-[13.5px] font-bold text-laly-teal">{busy === o.display_id ? t("aftersales.sending") : t("aftersales.choose")}</span>
        </button>
      ))}
      {error && (
        <p role="alert" className="text-[13.5px] font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
