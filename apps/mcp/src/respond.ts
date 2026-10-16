import { CHARACTER_LIMIT } from "./api.js"

export type Format = "markdown" | "json"

type ToolResult = {
  content: { type: "text"; text: string }[]
  structuredContent?: Record<string, unknown>
}

// Markdown for reading, JSON (also as structuredContent) for chaining calls.
export function respond(data: Record<string, unknown>, format: Format, markdown: () => string): ToolResult {
  if (format === "json") {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data }
  }
  const text = markdown()
  return {
    content: [
      {
        type: "text",
        text:
          text.length > CHARACTER_LIMIT
            ? `${text.slice(0, CHARACTER_LIMIT)}\n\n(Truncated. Use a smaller limit or response_format="json".)`
            : text,
      },
    ],
  }
}

export const ok = (text: string, data?: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text: data ? `${text}\n\n${JSON.stringify(data, null, 2)}` : text }],
})
