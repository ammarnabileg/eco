import { Block, Inline } from "@modules/content/lib/rich-text"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

function Parts({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.type === "bold" ? (
          <strong key={i} className="font-bold text-laly-ink">
            {p.text}
          </strong>
        ) : p.type === "link" ? (
          p.href.startsWith("/") ? (
            <LocalizedClientLink key={i} href={p.href} className="text-laly-teal font-bold underline underline-offset-4">
              {p.text}
            </LocalizedClientLink>
          ) : (
            <a key={i} href={p.href} rel="noopener noreferrer" target={p.href.startsWith("http") ? "_blank" : undefined} className="text-laly-teal font-bold underline underline-offset-4">
              {p.text}
            </a>
          )
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  )
}

export default function RichText({ blocks }: { blocks: Block[] }) {
  return (
    <div className="text-[15px] small:text-base leading-8 text-[#3B5158]">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2 key={i} id={b.id} className="scroll-mt-28 mt-10 first:mt-0 mb-3 text-xl small:text-[22px] font-extrabold text-laly-ink">
                {b.text}
              </h2>
            )
          case "h3":
            return (
              <h3 key={i} className="mt-6 mb-2 text-[17px] font-bold text-laly-ink">
                {b.text}
              </h3>
            )
          case "p":
            return (
              <p key={i} className="my-3">
                <Parts parts={b.parts} />
              </p>
            )
          default: {
            const List = b.type
            return (
              <List key={i} className={`my-3 ps-6 grid gap-1.5 ${b.type === "ul" ? "list-disc marker:text-laly-sand" : "list-decimal marker:text-laly-teal marker:font-bold"}`}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Parts parts={it} />
                  </li>
                ))}
              </List>
            )
          }
        }
      })}
    </div>
  )
}
