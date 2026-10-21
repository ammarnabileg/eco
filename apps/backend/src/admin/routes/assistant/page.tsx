import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Sparkles } from "@medusajs/icons"
import { Button, Container, Heading, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { sdk } from "../../lib/sdk"

type Action = { tool: string; input: Record<string, unknown>; summary: string; signature: string }
type ApiMessage = { role: "user" | "assistant"; content: unknown }
type Entry =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "action"; action: Action; state: "pending" | "done" | "dismissed" | "failed"; result?: string }

const STORAGE = "laly-assistant-v1"
const EXAMPLES = [
  "إيه أكتر 5 منتجات اتباعت الشهر ده؟",
  "زوّد أسعار كل راوترات TP-Link بنسبة 5%",
  "خلي سعر Tapo C200 بـ 12.900",
  "فيه طلبات لسه ما اتشحنتش؟",
]

type Saved = { messages: ApiMessage[]; entries: Entry[]; notes: string[] }
const load = (): Saved => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) ?? "") as Saved
  } catch {
    return { messages: [], entries: [], notes: [] }
  }
}

const AssistantPage = () => {
  const [state, setState] = useState<Saved>(load)
  const [text, setText] = useState("")
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state))
    } catch {
      // storage full or blocked: the chat still works for this visit
    }
    bottom.current?.scrollIntoView({ block: "end" })
  }, [state])

  const chat = useMutation({
    mutationFn: (message: string) =>
      sdk.client.fetch<{ messages: ApiMessage[]; reply: string; actions: Action[] }>("/admin/assistant/chat", {
        method: "POST",
        // Changes applied since the last message are told to the assistant.
        body: { messages: state.messages, text: [...state.notes, message].join("\n") },
      }),
    onMutate: (message) =>
      setState((s) => ({ ...s, entries: [...s.entries, { kind: "user", text: message }] })),
    onSuccess: (data) =>
      setState((s) => ({
        messages: data.messages,
        notes: [],
        entries: [
          ...s.entries,
          { kind: "assistant", text: data.reply },
          ...data.actions.map((action) => ({ kind: "action" as const, action, state: "pending" as const })),
        ],
      })),
    onError: (e: Error) => {
      toast.error(e.message)
      setState((s) => ({ ...s, entries: s.entries.slice(0, -1) }))
    },
  })

  const setAction = (signature: string, patch: Partial<Extract<Entry, { kind: "action" }>>, note?: string) =>
    setState((s) => ({
      ...s,
      notes: note ? [...s.notes, note] : s.notes,
      entries: s.entries.map((e) => (e.kind === "action" && e.action.signature === signature ? { ...e, ...patch } : e)),
    }))

  const execute = useMutation({
    mutationFn: (action: Action) =>
      sdk.client.fetch<{ result: string }>("/admin/assistant/execute", { method: "POST", body: { action } }),
    onSuccess: ({ result }, action) => {
      toast.success(result)
      setAction(action.signature, { state: "done", result }, `(تم التنفيذ: ${action.summary.split("\n")[0]})`)
    },
    onError: (e: Error, action) => setAction(action.signature, { state: "failed", result: e.message }),
  })

  const send = (message = text) => {
    if (!message.trim() || chat.isPending) return
    setText("")
    chat.mutate(message.trim())
  }

  return (
    <div className="flex flex-col gap-4">
      <Container className="flex items-start justify-between gap-4">
        <div>
          <Heading level="h1">المساعد الذكي</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            اسأل عن المنتجات والطلبات والمبيعات، أو اطلب تعديل أسعار ومنتجات. أي تعديل بيظهر كزرار، ومش بيتنفذ غير لما تضغط
            "تنفيذ".
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setState({ messages: [], entries: [], notes: [] })}>
          محادثة جديدة
        </Button>
      </Container>

      <Container className="flex h-[calc(100vh-260px)] min-h-[420px] flex-col p-0">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-ui-bg-subtle p-4">
          {!state.entries.length && (
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <Button key={e} size="small" variant="secondary" onClick={() => send(e)}>
                  {e}
                </Button>
              ))}
            </div>
          )}
          {state.entries.map((e, i) =>
            e.kind === "action" ? (
              <div key={e.action.signature} className="rounded-lg border border-ui-border-strong bg-ui-bg-base p-3 shadow-sm">
                <Text size="small" weight="plus" className="mb-1">
                  تعديل مقترح
                </Text>
                <Text size="small" className="whitespace-pre-wrap">
                  {e.action.summary}
                </Text>
                <div className="mt-2 flex items-center gap-2">
                  {e.state === "pending" ? (
                    <>
                      <Button
                        size="small"
                        isLoading={execute.isPending && execute.variables?.signature === e.action.signature}
                        disabled={execute.isPending}
                        onClick={() => execute.mutate(e.action)}
                      >
                        تنفيذ
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setAction(e.action.signature, { state: "dismissed" }, `(لم يُنفَّذ: ${e.action.summary.split("\n")[0]})`)}
                      >
                        تجاهل
                      </Button>
                    </>
                  ) : (
                    <Text size="xsmall" className={e.state === "failed" ? "text-ui-fg-error" : "text-ui-fg-muted"}>
                      {e.state === "done" ? `تم: ${e.result}` : e.state === "dismissed" ? "اتلغى" : `فشل: ${e.result}`}
                    </Text>
                  )}
                </div>
              </div>
            ) : (
              <div key={i} className={`flex ${e.kind === "user" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm ${
                    e.kind === "user" ? "bg-ui-bg-base" : "bg-ui-tag-blue-bg"
                  }`}
                >
                  {e.text}
                </div>
              </div>
            )
          )}
          {chat.isPending && (
            <Text size="small" className="text-ui-fg-muted">
              بيفكر…
            </Text>
          )}
          <div ref={bottom} />
        </div>
        <div className="flex items-end gap-2 border-t border-ui-border-base p-3">
          <Textarea
            rows={2}
            className="flex-1"
            placeholder="اكتب طلبك… (Enter للإرسال)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button size="small" disabled={!text.trim()} isLoading={chat.isPending} onClick={() => send()}>
            إرسال
          </Button>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "المساعد الذكي",
  icon: Sparkles,
})

export default AssistantPage
