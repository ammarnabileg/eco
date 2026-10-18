import { MedusaError } from "@medusajs/framework/utils"

// Evolution API v2 (self-hosted WhatsApp gateway): send text, set webhook.

export type EvolutionConfig = { baseUrl: string; instance: string; apiKey: string }

/** A refused or failed gateway call; `status` is 0 when it was never reached. */
export class EvolutionError extends MedusaError {
  constructor(
    public status: number,
    message: string
  ) {
    super(MedusaError.Types.UNEXPECTED_STATE, message)
  }
  /** The number itself is unusable (disconnected, banned, wrong key), not the message. */
  get numberProblem() {
    return this.status === 0 || this.status === 401 || this.status === 403 || this.status === 404 || this.status >= 500
  }
}

async function call<T>(cfg: EvolutionConfig, path: string, body?: unknown, method = "POST"): Promise<T> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}${path}/${encodeURIComponent(cfg.instance)}`
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    throw new EvolutionError(0, `WhatsApp gateway unreachable: ${(error as Error).message}`)
  }
  const text = await res.text()
  if (!res.ok) {
    throw new EvolutionError(res.status, `WhatsApp gateway error ${res.status}: ${text.slice(0, 300)}`)
  }
  return (text ? JSON.parse(text) : {}) as T
}

/** "open" when the number is logged in and can send. */
export async function connectionState(cfg: EvolutionConfig) {
  const res = await call<{ instance?: { state?: string }; state?: string }>(cfg, "/instance/connectionState", undefined, "GET")
  return res.instance?.state ?? res.state ?? "unknown"
}

export async function sendText(cfg: EvolutionConfig, number: string, text: string) {
  const res = await call<{ key?: { id?: string } }>(cfg, "/message/sendText", { number, text })
  return res.key?.id ?? null
}

// Interactive messages (Evolution sendButtons / sendCarousel). WhatsApp does
// not render them on every client, so callers keep a plain-text fallback.
export type Button =
  | { type: "reply"; id: string; text: string }
  | { type: "url"; text: string; url: string }
  | { type: "copy"; text: string; code: string }
  | { type: "call"; text: string; phone: string }

const toEvolution = (b: Button) =>
  b.type === "reply"
    ? { type: "reply", displayText: b.text, id: b.id }
    : b.type === "url"
      ? { type: "url", displayText: b.text, url: b.url }
      : b.type === "copy"
        ? { type: "copy", displayText: b.text, copyCode: b.code }
        : { type: "call", displayText: b.text, phoneNumber: b.phone }

export async function sendButtons(
  cfg: EvolutionConfig,
  number: string,
  msg: { title: string; description: string; footer?: string; buttons: Button[] }
) {
  const res = await call<{ key?: { id?: string } }>(cfg, "/message/sendButtons", {
    number,
    title: msg.title,
    description: msg.description,
    footer: msg.footer ?? "",
    buttons: msg.buttons.map(toEvolution),
  })
  return res.key?.id ?? null
}

export type Card = { body: string; footer?: string; imageUrl: string; buttons: Button[] }

/** Swipeable product cards (up to 10), each with an image and its own buttons. */
export async function sendCarousel(cfg: EvolutionConfig, number: string, msg: { body: string; cards: Card[] }) {
  const res = await call<{ key?: { id?: string } }>(cfg, "/message/sendCarousel", {
    number,
    body: msg.body,
    cards: msg.cards.slice(0, 10).map((c) => ({
      body: c.body,
      footer: c.footer ?? "",
      imageUrl: c.imageUrl,
      buttons: c.buttons.map(toEvolution),
    })),
  })
  return res.key?.id ?? null
}

/** Points the instance's webhook at the store, for customers' replies. */
export function setWebhook(cfg: EvolutionConfig, url: string, token: string) {
  return call(cfg, "/webhook/set", {
    webhook: {
      enabled: true,
      url,
      headers: { "x-laly-token": token },
      byEvents: false,
      base64: false,
      events: ["MESSAGES_UPSERT"],
    },
  })
}

export type Incoming = { phone: string; text: string; instance: string | null; name: string | null; id: string | null }

const MEDIA: Record<string, string> = {
  imageMessage: "📷 صورة",
  videoMessage: "🎥 فيديو",
  audioMessage: "🎤 رسالة صوتية",
  documentMessage: "📄 ملف",
  stickerMessage: "ملصق",
  locationMessage: "📍 موقع",
  contactMessage: "👤 جهة اتصال",
}

/** The sender, text and receiving instance of an incoming message, or null. */
export function incomingMessage(body: unknown): Incoming | null {
  const b = body as { event?: string; instance?: string; data?: Record<string, unknown> }
  if (String(b?.event ?? "").toLowerCase() !== "messages.upsert") return null
  const data = (b.data ?? {}) as {
    pushName?: string
    key?: { id?: string; remoteJid?: string; remoteJidAlt?: string; senderPn?: string; fromMe?: boolean }
    message?: Record<string, unknown> & {
      conversation?: string
      extendedTextMessage?: { text?: string }
      buttonsResponseMessage?: { selectedButtonId?: string }
      templateButtonReplyMessage?: { selectedId?: string }
      listResponseMessage?: { singleSelectReply?: { selectedRowId?: string } }
      interactiveResponseMessage?: { nativeFlowResponseMessage?: { paramsJson?: string } }
      imageMessage?: { caption?: string }
      videoMessage?: { caption?: string }
      documentMessage?: { caption?: string; fileName?: string }
    }
  }
  if (data.key?.fromMe) return null
  // Newer WhatsApp addresses chats by LID; the phone then comes alongside.
  const jid = [data.key?.remoteJid, data.key?.remoteJidAlt, data.key?.senderPn].find((j) => j?.endsWith("@s.whatsapp.net"))
  // A button tap arrives as the button's id.
  const m = data.message
  const media = Object.keys(MEDIA).find((k) => m?.[k])
  const caption = m?.imageMessage?.caption ?? m?.videoMessage?.caption ?? m?.documentMessage?.caption ?? m?.documentMessage?.fileName
  const text =
    m?.buttonsResponseMessage?.selectedButtonId ??
    m?.templateButtonReplyMessage?.selectedId ??
    m?.listResponseMessage?.singleSelectReply?.selectedRowId ??
    nativeFlowId(m?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) ??
    m?.conversation ??
    m?.extendedTextMessage?.text ??
    (media ? [MEDIA[media], caption].filter(Boolean).join(": ") : undefined)
  if (!jid || !text || jid.includes("-")) return null
  return { phone: jid.split("@")[0], text, instance: b.instance ?? null, name: data.pushName ?? null, id: data.key?.id ?? null }
}

// Newer clients send button taps as a native-flow reply carrying {"id": ...}.
function nativeFlowId(params?: string) {
  if (!params) return undefined
  try {
    const id = (JSON.parse(params) as { id?: unknown }).id
    return typeof id === "string" ? id : undefined
  } catch {
    return undefined
  }
}
