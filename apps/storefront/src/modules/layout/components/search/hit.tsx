"use client"

import Image from "next/image"
import type { Hit as HitType } from "instantsearch.js"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import { Text } from "@modules/common/components/ui"

export type ProductHit = HitType<{
  title: string | null
  handle: string | null
  thumbnail: string | null
}>

type SearchHitProps = {
  hit: ProductHit
  onNavigate?: () => void
}

const SearchHit = ({ hit, onNavigate }: SearchHitProps) => {
  if (!hit.handle) {
    return null
  }

  return (
    <li>
      <LocalizedClientLink
        href={`/products/${hit.handle}`}
        onClick={onNavigate}
        className="flex items-center gap-x-3 px-4 py-2.5 hover:bg-laly-teal-faint transition-colors"
        data-testid="search-hit-link"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-laly-bg border border-laly-line">
          {hit.thumbnail ? (
            <Image
              src={hit.thumbnail}
              alt=""
              fill
              sizes="56px"
              className="object-contain p-1"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-laly-faint">
              <PlaceholderImage size={20} />
            </div>
          )}
        </div>
        <Text className="text-sm font-bold text-laly-ink line-clamp-2">
          <bdi>{hit.title}</bdi>
        </Text>
      </LocalizedClientLink>
    </li>
  )
}

export default SearchHit
