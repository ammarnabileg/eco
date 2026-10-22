"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

import { localePath } from "@i18n/config"
import { useLocale } from "@i18n/client"

/**
 * A Next.js `<Link />` that keeps the visitor's country and language in the
 * address ("/kw/..." in Arabic, "/kw/en/..." in English).
 */
const LocalizedClientLink = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: () => void
  passHref?: true
  [x: string]: unknown
}) => {
  const { countryCode } = useParams()
  const locale = useLocale()

  return (
    <Link href={localePath(String(countryCode), locale, href)} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
