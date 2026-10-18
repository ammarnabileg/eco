import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"

import { sdk } from "../lib/sdk"

// Send this product to a customer on WhatsApp (a card with image, price and a
// buy button, or a text link when interactive messages are off).
const ProductWhatsappWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const send = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ kind: string }>("/admin/whatsapp/products", {
        method: "POST",
        body: { phone, product_ids: [data.id], ...(note.trim() ? { note } : {}) },
      }),
    onSuccess: ({ kind }) => toast.success(kind === "carousel" ? "اتبعت ككارت منتج" : "اتبعت كرسالة نصية بالرابط"),
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <Container className="flex flex-col gap-3 px-6 py-4">
      <Heading level="h2">إرسال على واتساب</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        ابعت المنتج لعميل سأل عنه: صورة وسعر وزرار شراء.
      </Text>
      <Input dir="ltr" placeholder="+965 5000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Textarea placeholder="رسالة مع المنتج (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      <Button
        size="small"
        variant="secondary"
        disabled={!phone || data.status !== "published"}
        isLoading={send.isPending}
        onClick={() => send.mutate()}
      >
        إرسال
      </Button>
      {data.status !== "published" && (
        <Text size="xsmall" className="text-ui-fg-muted">
          انشر المنتج الأول.
        </Text>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "product.details.side.after" })

export default ProductWhatsappWidget
