// The admin writes pages in plain text with a few markers ("## " headings,
// "- " lists, **bold**, [links](https://…)). This turns it into blocks that
// React renders as elements, so nothing written in the admin can ever run as
// HTML or script on the store.

export type Inline = { type: "text"; text: string } | { type: "bold"; text: string } | { type: "link"; text: string; href: string }
export type Block =
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; parts: Inline[] }
  | { type: "ul" | "ol"; items: Inline[][] }

// Only store paths, https, mail and phone links; anything else stays text.
export const safeHref = (href: string) => (/^(\/(?!\/)|https:\/\/|mailto:|tel:)/i.test(href.trim()) ? href.trim() : null)

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = []
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) })
    if (m[1] !== undefined) parts.push({ type: "bold", text: m[1] })
    else {
      const href = safeHref(m[3])
      parts.push(href ? { type: "link", text: m[2], href } : { type: "text", text: m[2] })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) })
  return parts
}

export function parseRichText(source: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: { type: "ul" | "ol"; items: Inline[][] } | null = null
  let h2 = 0
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", parts: parseInline(paragraph.join(" ")) })
    paragraph = []
    if (list) blocks.push(list)
    list = null
  }
  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line)
    if (heading) {
      flush()
      if (heading[1] === "##") blocks.push({ type: "h2", id: `section-${++h2}`, text: heading[2] })
      else blocks.push({ type: "h3", text: heading[2] })
      continue
    }
    const item = /^(?:([-*•])|(\d+)[.)])\s+(.+)$/.exec(line)
    if (item) {
      const type = item[1] ? "ul" : "ol"
      if (paragraph.length || (list && list.type !== type)) flush()
      list ??= { type, items: [] }
      list.items.push(parseInline(item[3]))
      continue
    }
    if (list) flush()
    paragraph.push(line)
  }
  flush()
  return blocks
}

export const sectionsOf = (blocks: Block[]) => blocks.filter((b): b is Extract<Block, { type: "h2" }> => b.type === "h2")
