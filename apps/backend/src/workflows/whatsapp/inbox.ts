import { MedusaContainer } from "@medusajs/framework/types"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

import { WHATSAPP_MODULE } from "../../modules/whatsapp"
import { Button, Card, sendButtons, sendCarousel, sendText } from "../../modules/whatsapp/client"
import WhatsAppModuleService from "../../modules/whatsapp/service"
import { whatsappSettings } from "./index"

// Every WhatsApp message in and out is kept per customer phone, so staff can
// read and answer conversations from the admin inbox.

const wa = (c: MedusaContainer) => c.resolve<WhatsAppModuleService>(WHATSAPP_MODULE)

export type Outgoing =
  | { type: "text"; text: string }
  | { type: "buttons"; title: string; text: string; footer?: string; buttons: Button[] }
  | { type: "carousel"; body: string; cards: Card[] }

/** What the inbox shows for a message we sent. */
export const previewOf = (m: Outgoing) =>
  m.type === "text"
    ? m.text
    : m.type === "buttons"
      ? `${m.text}\n\n${m.buttons.map((b) => `[${b.text}]`).join(" ")}`
      : `${m.body}\n\n${m.cards.map((c) => `▫️ ${c.body}${c.footer ? ` (${c.footer})` : ""}`).join("\n")}`

export type MessageRecord = {
  phone: string
  instance: string | null
  direction: "in" | "out"
  kind: string
  body: string
  status: "sent" | "failed" | "received"
  error?: string | null
  external_id?: string | null
  author_id?: string | null
  name?: string | null
}

const recordWaMessageStep = createStep(
  "record-wa-message",
  async (input: MessageRecord, { container }) => {
    const svc = wa(container)
    const [existing] = await svc.listWaConversations({ phone: input.phone }, { take: 1 })
    const before = existing
      ? {
          id: existing.id,
          name: existing.name,
          instance: existing.instance,
          last_message_at: existing.last_message_at,
          last_preview: existing.last_preview,
          unread: existing.unread,
        }
      : null
    const update = {
      last_message_at: new Date(),
      last_preview: input.body.slice(0, 200),
      ...(input.name ? { name: input.name } : {}),
      ...(input.instance ? { instance: input.instance } : {}),
    }
    const unread = (existing?.unread ?? 0) + (input.direction === "in" ? 1 : 0)
    const conversation = existing
      ? await svc.updateWaConversations({ id: existing.id, ...update, unread })
      : await svc.createWaConversations({ phone: input.phone, ...update, unread })
    const message = await svc.createWaMessages({
      conversation_id: conversation.id,
      phone: input.phone,
      instance: input.instance,
      direction: input.direction,
      kind: input.kind,
      body: input.body,
      status: input.status,
      error: input.error ?? null,
      external_id: input.external_id ?? null,
      author_id: input.author_id ?? null,
    })
    return new StepResponse(message, { message_id: message.id, conversation_id: conversation.id, before })
  },
  async (undo, { container }) => {
    if (!undo) return
    const svc = wa(container)
    await svc.deleteWaMessages([undo.message_id])
    if (undo.before) await svc.updateWaConversations(undo.before)
    else await svc.deleteWaConversations([undo.conversation_id])
  }
)

export const recordWaMessageWorkflow = createWorkflow(
  "record-wa-message",
  (input: MessageRecord) => new WorkflowResponse(recordWaMessageStep(input))
)

const markWaConversationReadStep = createStep(
  "mark-wa-conversation-read",
  async (input: { id: string }, { container }) => {
    const svc = wa(container)
    const conversation = await svc.retrieveWaConversation(input.id)
    await svc.updateWaConversations({ id: input.id, unread: 0 })
    return new StepResponse(true, { id: input.id, unread: conversation.unread })
  },
  async (prev, { container }) => {
    if (prev) await wa(container).updateWaConversations(prev)
  }
)

export const markWaConversationReadWorkflow = createWorkflow(
  "mark-wa-conversation-read",
  (input: { id: string }) => new WorkflowResponse(markWaConversationReadStep(input))
)

export type DeliverOptions = {
  kind: string
  author_id?: string | null
  /** Keep no record of a failure (the caller retries in another form). */
  quietFailure?: boolean
}

/** Sends one message and keeps it in the customer's conversation. */
export async function deliver(container: MedusaContainer, phone: string, message: Outgoing, opts: DeliverOptions) {
  const { cfg } = await whatsappSettings(container)
  const record = (r: Pick<MessageRecord, "status"> & Partial<MessageRecord>) =>
    recordWaMessageWorkflow(container).run({
      input: {
        phone,
        instance: cfg.instance || null,
        direction: "out",
        kind: opts.kind,
        body: previewOf(message),
        author_id: opts.author_id ?? null,
        ...r,
      },
    })
  try {
    const id =
      message.type === "text"
        ? await sendText(cfg, phone, message.text)
        : message.type === "buttons"
          ? await sendButtons(cfg, phone, { title: message.title, description: message.text, footer: message.footer, buttons: message.buttons })
          : await sendCarousel(cfg, phone, { body: message.body, cards: message.cards })
    await record({ status: "sent", external_id: id })
    return id
  } catch (error) {
    if (!opts.quietFailure) await record({ status: "failed", error: (error as Error).message.slice(0, 500) })
    throw error
  }
}
