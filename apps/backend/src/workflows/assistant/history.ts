// What earlier turns of an assistant conversation are sent back to the model.
// Only the conversation itself is kept: the staff member's messages and the
// assistant's written answers. Tool calls, tool results (product lists, sales
// figures) and reasoning from earlier turns are dropped; the answers already
// carry what mattered, and the model can look things up again. The current
// turn is never touched. Compaction is deterministic, so a compacted turn is
// sent the same way every time (which keeps provider caching useful).

export type Turn = { user: string; assistant: string }

type AnyMessage = { role?: string; content?: unknown; tool_calls?: unknown }

const textOfContent = (content: unknown): string => {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .filter((b): b is { type: string; text: string } => !!b && typeof b === "object" && (b as { type?: string }).type === "text")
    .map((b) => b.text)
    .join("\n")
}

const isToolResults = (m: AnyMessage) =>
  m.role === "tool" ||
  (Array.isArray(m.content) && m.content.length > 0 && m.content.every((b) => (b as { type?: string })?.type === "tool_result"))

/**
 * Turns a stored conversation (Anthropic or OpenAI-format messages, or the
 * compact form) into question/answer pairs. Several assistant messages of one
 * turn are joined; a turn the assistant never answered keeps an empty answer.
 */
export function toTurns(messages: unknown[]): Turn[] {
  const turns: Turn[] = []
  for (const raw of messages) {
    const m = (raw ?? {}) as AnyMessage
    if (m.role === "user" && !isToolResults(m)) {
      turns.push({ user: textOfContent(m.content), assistant: "" })
    } else if (m.role === "assistant" && turns.length) {
      const text = textOfContent(m.content).trim()
      if (text) {
        const t = turns[turns.length - 1]
        t.assistant = t.assistant ? `${t.assistant}\n\n${text}` : text
      }
    }
  }
  return turns.filter((t) => t.user.trim())
}

/** The last `keep` turns as plain user/assistant messages (same shape for both providers). */
export function compactHistory(messages: unknown[], keep: number) {
  const turns = toTurns(messages)
  return turns
    .slice(Math.max(0, turns.length - Math.max(0, keep)))
    .flatMap((t) => [
      { role: "user" as const, content: t.user },
      { role: "assistant" as const, content: t.assistant || "(لم يكتمل الرد)" },
    ])
}
