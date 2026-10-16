import Icon from "@modules/laly/components/icon"
import { TRUST_ITEMS } from "@modules/laly/lib/content"

export default function TrustStrip() {
  return (
    <section className="content-container small:-mt-14 relative z-10 mt-4">
      <ul className="flex small:grid small:grid-cols-5 gap-2 small:gap-0 overflow-x-auto no-scrollbar small:bg-white small:border small:border-laly-line small:rounded-card small:shadow-laly">
        {TRUST_ITEMS.map((item, i) => (
          <li
            key={item.title}
            className={`shrink-0 flex items-center gap-2 small:gap-3 rounded-full small:rounded-none bg-white small:bg-transparent border small:border-0 border-laly-line px-3 py-2 small:px-5 small:py-5 ${
              i > 0 ? "small:border-s small:border-laly-line" : ""
            }`}
          >
            <span className="small:w-11 small:h-11 small:rounded-[13px] small:bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
              <Icon name={item.icon} size={20} />
            </span>
            <span>
              <span className="block text-xs small:text-[13.5px] font-extrabold whitespace-nowrap">
                {item.title}
              </span>
              <span className="hidden small:block text-xs text-laly-mut">
                {item.sub}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
