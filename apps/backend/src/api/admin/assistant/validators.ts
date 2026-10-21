import { z } from "@medusajs/framework/zod"

// The conversation is kept by the admin's browser and returned as is.
export const AssistantChat = z
  .object({
    messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.unknown() })).max(200).default([]),
    text: z.string().trim().min(1).max(4000),
  })
  .strict()

export const AssistantExecute = z
  .object({
    action: z
      .object({
        tool: z.string(),
        input: z.record(z.string(), z.unknown()),
        summary: z.string(),
        signature: z.string(),
      })
      .strict(),
  })
  .strict()

export type AssistantChatType = z.infer<typeof AssistantChat>
export type AssistantExecuteType = z.infer<typeof AssistantExecute>
