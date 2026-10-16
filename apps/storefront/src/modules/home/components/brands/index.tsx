import { BRANDS } from "@modules/laly/lib/content"

export default function Brands() {
  return (
    <section className="content-container mt-10 small:mt-14">
      <h2 className="text-sm small:text-base font-extrabold text-laly-mut mb-4">
        نتعامل مع أفضل الماركات العالمية
      </h2>
      <ul className="flex flex-wrap gap-2 small:gap-3">
        {BRANDS.map((b) => (
          <li
            key={b}
            dir="ltr"
            className="font-latin text-xs small:text-sm font-bold text-laly-faint bg-white border border-laly-line rounded-full px-4 py-2"
          >
            {b}
          </li>
        ))}
      </ul>
    </section>
  )
}
