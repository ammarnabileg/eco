import type { TrustBadge } from "@lib/data/content"
import { localize } from "@lib/util/localize"
import { HttpTypes } from "@medusajs/types"
import Icon, { isIconName } from "@modules/laly/components/icon"

// Description, specifications, and the store's commitments (warranty,
// returns, delivery) taken from the admin-managed trust badges.
export default function ProductDetails({
  product,
  badges,
}: {
  product: HttpTypes.StoreProduct
  badges: TrustBadge[]
}) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const variant = product.variants?.length === 1 ? product.variants[0] : undefined
  const specs = [
    { label: "الماركة", value: metadata.brand },
    { label: "رقم المنتج (SKU)", value: variant?.sku },
    { label: "النوع", value: product.type?.value },
    { label: "بلد المنشأ", value: product.origin_country?.toUpperCase() },
    { label: "الوزن", value: product.weight ? `${product.weight} جم` : undefined },
  ].filter((s): s is { label: string; value: string } => typeof s.value === "string" && !!s.value)

  const sections = [
    product.description && {
      id: "description",
      title: "الوصف",
      body: (
        <p className="whitespace-pre-line leading-8 text-laly-mut" data-testid="product-description">
          {product.description}
        </p>
      ),
    },
    specs.length > 0 && {
      id: "specs",
      title: "المواصفات",
      body: (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
          {specs.map((s) => (
            <div key={s.label} className="contents">
              <dt className="text-laly-mut">{s.label}</dt>
              <dd dir="auto" className="font-bold">{s.value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    badges.length > 0 && {
      id: "service",
      title: "الضمان والتوصيل والإرجاع",
      body: (
        <ul className="grid gap-3">
          {badges.map((b) => (
            <li key={b.id} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-[10px] bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
                <Icon name={isIconName(b.icon) ? b.icon : "check"} size={18} />
              </span>
              <span>
                <span className="block text-sm font-bold">{localize(b, "title")}</span>
                <span className="block text-xs text-laly-mut">{localize(b, "subtitle")}</span>
              </span>
            </li>
          ))}
        </ul>
      ),
    },
  ].filter(Boolean) as { id: string; title: string; body: React.ReactNode }[]

  return (
    <div className="bg-white border border-laly-line rounded-card divide-y divide-laly-line">
      {sections.map((s, i) => (
        <details key={s.id} open={i === 0} className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 font-extrabold">
            {s.title}
            <Icon name="chevr" size={18} className="rotate-90 group-open:-rotate-90 transition-transform text-laly-mut" />
          </summary>
          <div className="px-5 pb-5">{s.body}</div>
        </details>
      ))}
    </div>
  )
}
