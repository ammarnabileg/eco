import { whatsappLink } from "@lib/util/localize"
import Icon from "@modules/laly/components/icon"

export default function InstallCta({ whatsapp }: { whatsapp: string | null }) {
  const href = whatsappLink(whatsapp, "أريد حجز موعد تركيب")
  if (!href) {
    return null
  }

  return (
    <section className="content-container mt-10 small:mt-14">
      <div className="flex flex-col small:flex-row small:items-center gap-4 rounded-card bg-laly-deep text-white p-5 small:p-8">
        <span className="hidden small:flex w-14 h-14 rounded-2xl bg-white/10 text-laly-sand items-center justify-center shrink-0">
          <Icon name="wrench" size={26} />
        </span>
        <div className="flex-1">
          <h2 className="text-lg small:text-2xl font-extrabold">
            تركيب احترافي على إيد فنيين معتمدين
          </h2>
          <p className="mt-1 text-[13px] small:text-sm text-[#B9D3D8]">
            معاينة وتركيب بسرعة وبموعد محدد
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start small:self-auto inline-flex items-center rounded-btn bg-laly-sand hover:bg-laly-sand-d text-[#26200D] font-bold text-sm px-5 py-3 transition-colors"
        >
          احجز موعد التركيب
        </a>
      </div>
    </section>
  )
}
