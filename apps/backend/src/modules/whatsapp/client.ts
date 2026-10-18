import { MedusaError } from "@medusajs/framework/utils"

// Evolution API v2 (self-hosted WhatsApp gateway): send text, set webhook.

export type EvolutionConfig = { baseUrl: string; instance: string; apiKey: string }

async function call<T>(cfg: EvolutionConfig, path: string, body: unknown): Promise<T> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}${path}/${encodeURIComponent(cfg.instance)}`
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { apikey: cfg.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `WhatsApp gateway unreachable: ${(error as Error).message}`)
  }
  const text = await res.text()
  if (!res.ok) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `WhatsApp gateway error ${res.status}: ${text.slice(0, 300)}`)
  }
  return (text ? JSON.parse(text) : {}) as T
}

export async function sendText(cfg: EvolutionConfig, number: string, text: string) {
  const res = await call<{ key?: { id?: string } }>(cfg, "/message/sendText", { number, text })
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

/** The sender's number and text of an incoming message, or null. */
export function incomingMessage(body: unknown): { phone: string; text: string } | null {
  const b = body as { event?: string; data?: Record<string, unknown> }
  if (String(b?.event ?? "").toLowerCase() !== "messages.upsert") return null
  const data = (b.data ?? {}) as {
    key?: { remoteJid?: string; remoteJidAlt?: string; senderPn?: string; fromMe?: boolean }
    message?: { conversation?: string; extendedTextMessage?: { text?: string } }
  }
  if (data.key?.fromMe) return null
  // Newer WhatsApp addresses chats by LID; the phone then comes alongside.
  const jid = [data.key?.remoteJid, data.key?.remoteJidAlt, data.key?.senderPn].find((j) => j?.endsWith("@s.whatsapp.net"))
  const text = data.message?.conversation ?? data.message?.extendedTextMessage?.text
  if (!jid || !text || jid.includes("-")) return null
  return { phone: jid.split("@")[0], text }
}
