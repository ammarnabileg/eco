import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/laly/components/icon"
import { CONTACT } from "@modules/laly/lib/content"

export default function Hero() {
  const installHref = CONTACT.whatsapp
    ? `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("أريد حجز موعد تركيب")}`
    : null

  return (
    <section className="small:relative small:bg-[radial-gradient(1100px_520px_at_18%_-10%,#12525F_0%,transparent_55%),linear-gradient(160deg,#0A2A31_0%,#0B333B_46%,#0E4652_100%)] small:pt-16 small:pb-24 px-4 pt-4 small:px-0">
      <div className="content-container !px-0 small:!px-6 grid small:grid-cols-[1fr_1.08fr] gap-8 items-center rounded-[18px] small:rounded-none overflow-hidden bg-[linear-gradient(160deg,#0A2A31_0%,#0B333B_46%,#0E4652_100%)] small:bg-none p-5 small:p-0 text-white">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-laly-sand/40 bg-laly-sand/10 text-laly-sand text-[11.5px] small:text-xs font-bold px-3 py-1.5">
            <Icon name="bolt" size={14} />
            متجر كويتي متخصص بالتقنية والحماية
          </span>
          <h1 className="mt-4 text-[26px] small:text-[clamp(32px,4.4vw,54px)] font-extrabold leading-[1.18]">
            أمان ذكي <br className="hidden small:block" />
            <span className="text-laly-sand">لكل بيت في الكويت</span>
          </h1>
          <p className="mt-3 text-[13.5px] small:text-[15.5px] text-[#B9D3D8] max-w-[430px] leading-7">
            كاميرات مراقبة وأنظمة حماية متكاملة — بيع وتركيب وصيانة، من الجهراء
            إلى الأحمدي.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center gap-2 rounded-btn bg-laly-sand hover:bg-laly-sand-d text-[#26200D] font-bold text-sm px-5 py-3 transition-colors"
            >
              تسوّق الآن
              <Icon name="arrowr" size={17} className="rtl:-scale-x-100" />
            </LocalizedClientLink>
            {installHref && (
              <a
                href={installHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-btn border-[1.6px] border-white/55 hover:border-white hover:bg-white/10 font-bold text-sm px-5 py-3 transition-colors"
              >
                احجز تركيب
              </a>
            )}
          </div>
        </div>
        <div className="hidden small:block">
          {/* Decorative illustration from the design: Kuwait Towers under a security scan. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-kuwait.svg"
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
