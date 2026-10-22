import { Fragment, ReactNode } from "react"

/**
 * Renders a translated sentence whose {name} placeholders are elements (a
 * phone number in an LTR span, a bold digit...). Call t() without vars so
 * the placeholders are still in the text: richText(t("order.x"), { id: <b>1</b> }).
 * Works in server and client components.
 */
export function richText(text: string, nodes: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/g).map((part, i) => {
    const name = part.match(/^\{(\w+)\}$/)?.[1]
    return <Fragment key={i}>{name && name in nodes ? nodes[name] : part}</Fragment>
  })
}
