"use client"

import Image from "next/image"
import { useRef, useState } from "react"

import { HttpTypes } from "@medusajs/types"
import PlaceholderImage from "@modules/common/icons/placeholder-image"

// Desktop: large image with a thumbnail strip. Mobile: full-width swipe with
// dots. Same component, layout picked by the server-detected device.
export default function Gallery({
  images,
  title,
  layout,
  badge,
}: {
  images: HttpTypes.StoreProductImage[]
  title: string
  layout: "mobile" | "desktop"
  badge?: React.ReactNode
}) {
  const [active, setActive] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const list = images.filter((i) => !!i.url)

  if (!list.length) {
    return (
      <div className="relative aspect-square rounded-card bg-white border border-laly-line flex items-center justify-center">
        <PlaceholderImage size={32} />
      </div>
    )
  }

  if (layout === "mobile") {
    return (
      <div className="relative -mx-4">
        <div
          ref={scroller}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-white"
          onScroll={(e) => {
            const el = e.currentTarget
            setActive(Math.round(Math.abs(el.scrollLeft) / el.clientWidth))
          }}
        >
          {list.map((image, i) => (
            <div key={image.id} className="relative shrink-0 w-full aspect-square snap-center">
              <Image
                src={image.url!}
                alt={i === 0 ? title : ""}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-contain p-6"
              />
            </div>
          ))}
        </div>
        {badge && <div className="absolute top-3 start-4">{badge}</div>}
        {list.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {list.map((image, i) => (
              <span
                key={image.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-5 bg-laly-teal" : "w-1.5 bg-laly-line"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const current = list[active] ?? list[0]
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square rounded-card bg-white border border-laly-line overflow-hidden">
        <Image
          src={current.url!}
          alt={title}
          fill
          priority
          sizes="(max-width: 1280px) 50vw, 600px"
          className="object-contain p-10"
        />
        {badge && <div className="absolute top-4 start-4">{badge}</div>}
      </div>
      {list.length > 1 && (
        <div className="flex gap-3">
          {list.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`صورة ${i + 1}`}
              aria-current={i === active}
              className={`relative w-20 h-20 rounded-btn bg-white border-2 overflow-hidden ${
                i === active ? "border-laly-teal" : "border-laly-line"
              }`}
            >
              <Image src={image.url!} alt="" fill sizes="80px" className="object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
