"use client"

import { FormEvent, useState } from "react"

import { submitQuoteRequest } from "@lib/data/catalog"
import { whatsappLink } from "@lib/util/localize"
import Icon from "@modules/laly/components/icon"
import Sheet from "@modules/laly/components/sheet"

const PHONE = /^\+?[0-9 ]{8,16}$/

const inputClass =
  "w-full h-11 rounded-btn border-[1.6px] border-laly-line bg-white px-3 text-sm focus:border-laly-teal focus:outline-none"

/**
 * Price-on-request products: a quote form (stored for staff) plus WhatsApp.
 */
export default function QuoteRequest({
  productId,
  variantId,
  productTitle,
  whatsapp,
  layout = "desktop",
}: {
  productId: string
  variantId?: string
  productTitle: string
  whatsapp?: string | null
  layout?: "mobile" | "desktop"
}) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  )
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    quantity: "1",
    message: "",
    website: "",
  })

  const wa = whatsappLink(
    whatsapp ?? null,
    `السلام عليكم، أرغب بعرض سعر لـ: ${productTitle}`
  )

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.customer_name.trim().length < 2) {
      setError("اكتب اسمك من فضلك.")
      return
    }
    if (!PHONE.test(form.phone.trim())) {
      setError("رقم الهاتف غير صحيح. مثال: 9999 1234")
      return
    }
    setStatus("sending")
    const result = await submitQuoteRequest({
      product_id: productId,
      variant_id: variantId,
      customer_name: form.customer_name,
      phone: form.phone,
      quantity: Math.max(1, Math.min(10000, Number(form.quantity) || 1)),
      message: form.message,
      website: form.website,
    })
    if (result.ok) {
      setStatus("sent")
    } else {
      setStatus("error")
      setError("تعذّر إرسال الطلب. حاول مرة أخرى أو راسلنا على واتساب.")
    }
  }

  const close = () => {
    setOpen(false)
    if (status === "sent") {
      setStatus("idle")
      setForm({
        customer_name: "",
        phone: "",
        quantity: "1",
        message: "",
        website: "",
      })
    }
  }

  const buttons = (extra: string) => (
    <div className={`flex items-stretch gap-2 ${extra}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 h-12 flex items-center justify-center gap-2 rounded-btn bg-laly-teal text-white font-bold text-[15px] hover:bg-laly-teal-d transition-colors"
        data-testid="quote-request-button"
      >
        <Icon name="tag" size={19} />
        اطلب عرض سعر
      </button>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="اطلب السعر عبر واتساب"
          className="h-12 px-4 flex items-center justify-center gap-2 rounded-btn border-[1.6px] border-laly-green text-laly-green font-bold text-sm hover:bg-laly-green hover:text-white transition-colors"
        >
          <Icon name="chat" size={19} />
          <span className={layout === "mobile" ? "sr-only" : ""}>واتساب</span>
        </a>
      )}
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-2">
        <p
          className="text-[22px] font-extrabold"
          data-testid="price-on-request"
        >
          السعر عند الطلب
        </p>
        <p className="text-sm text-laly-mut">
          سعر هذا المنتج يعتمد على الكمية والتركيب. أرسل طلبك وسيتواصل معك
          فريقنا بعرض سعر.
        </p>
      </div>
      {buttons("")}

      {layout === "mobile" && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-laly-line px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(20,38,44,.4)]">
          {buttons("")}
        </div>
      )}

      <Sheet open={open} onClose={close} title="طلب عرض سعر" layout={layout}>
        {status === "sent" ? (
          <div
            className="flex flex-col items-center text-center gap-3 py-6"
            role="status"
          >
            <span className="w-14 h-14 rounded-full bg-laly-teal-soft text-laly-teal flex items-center justify-center">
              <Icon name="check" size={28} />
            </span>
            <p className="text-lg font-extrabold">وصلنا طلبك</p>
            <p className="text-sm text-laly-mut">
              سيتواصل معك فريق المبيعات قريباً بعرض السعر.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-2 h-11 px-6 rounded-btn bg-laly-teal text-white font-bold"
            >
              تم
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <p className="text-sm text-laly-mut line-clamp-2" dir="auto">
              {productTitle}
            </p>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              الاسم
              <input
                className={inputClass}
                value={form.customer_name}
                onChange={set("customer_name")}
                autoComplete="name"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              رقم الهاتف
              <input
                className={inputClass}
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+965 9999 1234"
                value={form.phone}
                onChange={set("phone")}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              الكمية
              <input
                className={inputClass}
                type="number"
                min={1}
                max={10000}
                inputMode="numeric"
                value={form.quantity}
                onChange={set("quantity")}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              ملاحظات (اختياري)
              <textarea
                className={`${inputClass} h-24 py-2`}
                maxLength={1000}
                placeholder="مثال: أحتاج تركيب في الأحمدي"
                value={form.message}
                onChange={set("message")}
              />
            </label>
            {/* Honeypot: hidden from people, filled only by bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -start-[9999px] w-px h-px opacity-0"
              value={form.website}
              onChange={set("website")}
            />
            {error && (
              <p className="text-sm font-bold text-laly-red" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="h-12 rounded-btn bg-laly-teal text-white font-bold hover:bg-laly-teal-d disabled:bg-laly-line disabled:text-laly-faint"
            >
              {status === "sending" ? "جاري الإرسال…" : "إرسال الطلب"}
            </button>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-sm font-bold text-laly-green hover:underline"
              >
                أو راسلنا مباشرة على واتساب
              </a>
            )}
          </form>
        )}
      </Sheet>
    </>
  )
}
