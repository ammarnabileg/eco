"use client"

import { useEffect, useState } from "react"

import { useLocale, useT } from "@i18n/client"
import type { HeroSlide } from "@lib/data/content"
import { localize } from "@lib/util/localize"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"

const AUTOPLAY_MS = 6500

export default function HeroCarousel({
  slides,
  installHref,
}: {
  slides: HeroSlide[]
  installHref: string | null
}) {
  const t = useT()
  const locale = useLocale()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (paused || reduceMotion || slides.length < 2) {
      return
    }
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      AUTOPLAY_MS
    )
    return () => clearInterval(timer)
  }, [paused, slides.length])

  const slide = slides[index] ?? slides[0]
  const eyebrow = localize(slide, "eyebrow", locale)
  const highlight = localize(slide, "highlight", locale)
  const subtitle = localize(slide, "subtitle", locale)
  const ctaLabel = localize(slide, "cta_label", locale) || t("home.hero_cta_default")
  const ctaUrl = slide.cta_url || "/store"
  const ctaClass =
    "inline-flex items-center gap-2 rounded-btn bg-laly-sand hover:bg-laly-sand-d text-[#26200D] font-bold text-sm px-5 py-3 transition-colors"

  // `onLight`: the dots sit on the page background on phones (banner slides).
  const dots = (onLight = false) =>
    slides.length > 1 ? (
      <div className={`${onLight ? "mt-4" : "mt-6 small:mt-8"} flex items-center gap-2.5`}>
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t("home.hero_slide", { number: i + 1 })}
            aria-current={i === index}
            className={`h-[9px] rounded-full transition-all ${
              i === index
                ? "w-[26px] bg-laly-sand"
                : onLight
                  ? "w-[9px] bg-black/20 small:bg-white/30"
                  : "w-[9px] bg-white/30"
            }`}
          />
        ))}
      </div>
    ) : null

  // A banner designed in the admin studio already has its text and price in
  // the image: show it whole, linked to its page, with the title as alt text.
  if (slide.banner_url) {
    const image = (
      <picture key={slide.id} className="block animate-fade-in-top">
        {slide.banner_mobile_url && (
          <source media="(max-width: 1023px)" srcSet={slide.banner_mobile_url} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.banner_url}
          alt={localize(slide, "title", locale)}
          width={1920}
          height={600}
          className="w-full h-auto rounded-[18px] small:rounded-[22px]"
        />
      </picture>
    )
    return (
      <section
        aria-roledescription="carousel"
        aria-label={t("home.hero_label")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="small:bg-[linear-gradient(160deg,#0A2A31_0%,#0B333B_46%,#0E4652_100%)] px-4 pt-4 small:px-0 small:pt-10 small:pb-12"
      >
        <div className="content-container !px-0 small:!px-6 flex flex-col items-center">
          {ctaUrl.startsWith("/") ? (
            <LocalizedClientLink href={ctaUrl} className="block w-full">
              {image}
            </LocalizedClientLink>
          ) : (
            <a href={ctaUrl} className="block w-full" rel="noopener noreferrer">
              {image}
            </a>
          )}
          {dots(true)}
        </div>
      </section>
    )
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("home.hero_label")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="small:relative small:bg-[radial-gradient(1100px_520px_at_18%_-10%,#12525F_0%,transparent_55%),linear-gradient(160deg,#0A2A31_0%,#0B333B_46%,#0E4652_100%)] small:pt-16 small:pb-24 px-4 pt-4 small:px-0"
    >
      <div className="content-container !px-0 small:!px-6 grid small:grid-cols-[1fr_1.08fr] gap-8 items-center rounded-[18px] small:rounded-none overflow-hidden bg-[linear-gradient(160deg,#0A2A31_0%,#0B333B_46%,#0E4652_100%)] small:bg-none p-5 small:p-0 text-white">
        <div key={slide.id} className="animate-fade-in-top" aria-live="polite">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-laly-sand/40 bg-laly-sand/10 text-laly-sand text-[11.5px] small:text-xs font-bold px-3 py-1.5">
              <Icon name="bolt" size={14} />
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 text-[26px] small:text-[clamp(32px,4.4vw,54px)] font-extrabold leading-[1.18]">
            {localize(slide, "title", locale)} <br className="hidden small:block" />
            {highlight && <span className="text-laly-sand">{highlight}</span>}
          </h1>
          {subtitle && (
            <p className="mt-3 text-[13.5px] small:text-[15.5px] text-[#B9D3D8] max-w-[430px] leading-7">
              {subtitle}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {ctaUrl.startsWith("/") ? (
              <LocalizedClientLink href={ctaUrl} className={ctaClass}>
                {ctaLabel}
                <Icon name="arrowr" size={17} className="rtl:-scale-x-100" />
              </LocalizedClientLink>
            ) : (
              <a href={ctaUrl} className={ctaClass} rel="noopener noreferrer">
                {ctaLabel}
                <Icon name="arrowr" size={17} className="rtl:-scale-x-100" />
              </a>
            )}
            {installHref && (
              <a
                href={installHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-btn border-[1.6px] border-white/55 hover:border-white hover:bg-white/10 font-bold text-sm px-5 py-3 transition-colors"
              >
                {t("home.hero_install")}
              </a>
            )}
          </div>
          {dots()}
        </div>
        <div className="hidden small:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image_url || "/hero-kuwait.svg"}
            alt=""
            width={560}
            height={340}
            className="w-full h-auto drop-shadow-[0_30px_40px_rgba(0,0,0,.35)]"
          />
        </div>
      </div>
    </section>
  )
}
