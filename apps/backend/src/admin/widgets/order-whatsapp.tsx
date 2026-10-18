import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

import { sdk } from "../lib/sdk"

type Confirmation = { status: string; phone: string; error: string | null; responded_at: string | null }

const LABEL: Record<string, { text: string; color: "green" | "orange" | "red" | "grey" }> = {
  sent: { text: "اتبعتت، مستنيين رد العميل", color: "grey" },
  confirmed: { text: "العميل أكّد الطلب", color: "green" },
  cancel_requested: { text: "العميل طلب الإلغاء", color: "red" },
  failed: { text: "فشل الإرسال", color: "orange" },
}

// The WhatsApp order summary and the customer's reply.
const OrderWhatsappWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const { data: res } = useQuery({
    queryKey: ["whatsapp", data.id],
    queryFn: () => sdk.client.fetch<{ confirmation: Confirmation | null }>(`/admin/whatsapp/orders/${data.id}`),
  })
  const c = res?.confirmation
  if (!c) return null
  const label = LABEL[c.status] ?? { text: c.status, color: "grey" as const }
  return (
    <Container className="flex flex-col gap-2">
      <Heading level="h2">واتساب</Heading>
      <div className="flex items-center gap-2">
        <Badge color={label.color} size="2xsmall">
          {label.text}
        </Badge>
        <Text size="small" dir="ltr" className="text-ui-fg-subtle">
          +{c.phone}
        </Text>
      </div>
      {c.status === "cancel_requested" && (
        <Text size="small" className="text-ui-fg-error">
          الطلب ما اتلغاش تلقائياً: كلّم العميل وألغيه من هنا لو اتأكدت.
        </Text>
      )}
      {c.error && (
        <Text size="xsmall" dir="ltr" className="text-ui-fg-muted">
          {c.error}
        </Text>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.side.after" })

export default OrderWhatsappWidget
