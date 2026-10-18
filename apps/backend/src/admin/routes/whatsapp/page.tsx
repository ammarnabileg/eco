import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { sdk } from "../../lib/sdk"

type Conversation = {
  id: string
  phone: string
  name: string | null
  last_message_at: string | null
  last_preview: string | null
  unread: number
}

type Message = {
  id: string
  direction: "in" | "out"
  kind: string
  body: string
  status: "sent" | "failed" | "received"
  error: string | null
  created_at: string
}

type Order = { id: string; display_id: number; total: number; currency_code: string; status: string; created_at: string }

const KIND: Record<string, string> = {
  order: "رسالة الطلب",
  otp: "رمز تحقق",
  welcome: "ترحيب",
  reply: "رد آلي",
  products: "منتجات",
  cart_reminder: "تذكير سلة",
  test: "تجربة",
  staff: "",
  customer: "",
}

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ar-KW", { dateStyle: "short", timeStyle: "short" }) : ""

function ConversationList({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const { data } = useQuery({
    queryKey: ["wa-conversations", q, unreadOnly],
    queryFn: () =>
      sdk.client.fetch<{ conversations: Conversation[]; count: number; unread: number }>("/admin/whatsapp/conversations", {
        query: { q: q || undefined, unread: unreadOnly ? "true" : undefined, limit: 50 },
      }),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  })
  return (
    <div className="flex min-h-0 flex-col border-ui-border-base md:border-e">
      <div className="flex flex-col gap-2 border-b border-ui-border-base p-3">
        <Input size="small" placeholder="بحث بالرقم أو الاسم" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
          غير المقروءة فقط {data?.unread ? <Badge size="2xsmall" color="green">{data.unread}</Badge> : null}
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {data?.conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`flex w-full flex-col gap-0.5 border-b border-ui-border-base px-3 py-2 text-start hover:bg-ui-bg-base-hover ${
              selected === c.id ? "bg-ui-bg-highlight" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Text size="small" weight="plus" className="truncate">
                {c.name || <span dir="ltr">+{c.phone}</span>}
              </Text>
              {c.unread > 0 && <Badge size="2xsmall" color="green">{c.unread}</Badge>}
            </div>
            <Text size="xsmall" className="truncate text-ui-fg-subtle">
              {c.last_preview}
            </Text>
            <Text size="xsmall" className="text-ui-fg-muted">
              {time(c.last_message_at)}
            </Text>
          </button>
        ))}
        {data && !data.conversations.length && (
          <Text size="small" className="p-4 text-ui-fg-muted">
            لا توجد محادثات.
          </Text>
        )}
      </div>
    </div>
  )
}

function Thread({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState("")
  const bottom = useRef<HTMLDivElement>(null)
  const { data } = useQuery({
    queryKey: ["wa-conversation", id],
    queryFn: () =>
      sdk.client.fetch<{ conversation: Conversation; messages: Message[]; orders: Order[] }>(
        `/admin/whatsapp/conversations/${id}`
      ),
    refetchInterval: 5_000,
  })
  const lastId = data?.messages.at(-1)?.id
  const unread = data?.conversation.unread ?? 0

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" })
  }, [lastId])

  useEffect(() => {
    if (!unread) return
    sdk.client
      .fetch(`/admin/whatsapp/conversations/${id}/read`, { method: "POST" })
      .then(() => queryClient.invalidateQueries({ queryKey: ["wa-conversations"] }))
      .catch(() => undefined)
  }, [id, unread, queryClient])

  const send = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/whatsapp/conversations/${id}/messages`, { method: "POST", body: { text } }),
    onSuccess: () => {
      setText("")
      queryClient.invalidateQueries({ queryKey: ["wa-conversation", id] })
      queryClient.invalidateQueries({ queryKey: ["wa-conversations"] })
    },
    onError: (e: Error) => {
      toast.error(e.message)
      queryClient.invalidateQueries({ queryKey: ["wa-conversation", id] })
    },
  })

  if (!data) return <div className="p-4">جاري التحميل…</div>
  const c = data.conversation
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ui-border-base p-3">
        <div>
          <Text weight="plus">{c.name || "عميل"}</Text>
          <a dir="ltr" className="text-ui-fg-interactive text-sm" href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer">
            +{c.phone}
          </a>
        </div>
        <div className="flex flex-wrap gap-1">
          {data.orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`}>
              <Badge size="2xsmall" color="blue">
                طلب #{o.display_id}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-ui-bg-subtle p-3">
        {data.messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${
                m.direction === "out" ? "bg-ui-tag-green-bg" : "bg-ui-bg-base"
              } ${m.status === "failed" ? "border border-ui-tag-red-border" : ""}`}
            >
              {KIND[m.kind] && (
                <Text size="xsmall" className="mb-1 text-ui-fg-muted">
                  {KIND[m.kind]}
                </Text>
              )}
              <Text size="small" className="whitespace-pre-wrap break-words">
                {m.body}
              </Text>
              <Text size="xsmall" className="mt-1 text-ui-fg-muted">
                {time(m.created_at)}
                {m.status === "failed" ? ` · لم تُرسل: ${m.error ?? ""}` : ""}
              </Text>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="flex items-end gap-2 border-t border-ui-border-base p-3">
        <Textarea
          rows={2}
          className="flex-1"
          placeholder="اكتب ردك… (Enter للإرسال، Shift+Enter لسطر جديد)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && text.trim() && !send.isPending) {
              e.preventDefault()
              send.mutate()
            }
          }}
        />
        <Button size="small" disabled={!text.trim()} isLoading={send.isPending} onClick={() => send.mutate()}>
          إرسال
        </Button>
      </div>
    </div>
  )
}

const WhatsappInboxPage = () => {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <Container>
        <Heading level="h1">رسائل واتساب</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          كل الرسائل اللي اتبعتت للعملاء واللي وصلت منهم. الرد من هنا بيتبعت من رقم المتجر.
        </Text>
      </Container>
      <Container className="grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-1 overflow-hidden p-0 md:grid-cols-[320px_1fr]">
        <ConversationList selected={selected} onSelect={setSelected} />
        {selected ? (
          <Thread key={selected} id={selected} />
        ) : (
          <div className="hidden items-center justify-center text-ui-fg-muted md:flex">اختار محادثة</div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "واتساب",
  icon: ChatBubbleLeftRight,
})

export default WhatsappInboxPage
