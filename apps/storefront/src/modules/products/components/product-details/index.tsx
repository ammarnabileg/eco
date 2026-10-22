import { getLocale, getT } from "@i18n/server"
import type { TrustBadge } from "@lib/data/content"
import { productBrand, productDetail, SpecGroup } from "@lib/util/catalog"
import { localize } from "@lib/util/localize"
import { HttpTypes } from "@medusajs/types"
import Icon, { isIconName } from "@modules/laly/components/icon"
import ProductSpecs from "@modules/products/components/product-specs"
import { productText } from "@modules/products/lib/product-text"

// Description, specifications, and the store's commitments (warranty,
// returns, delivery) taken from the admin-managed trust badges.
export default async function ProductDetails({
  product,
  badges,
  specGroups = [],
}: {
  product: HttpTypes.StoreProduct
  badges: TrustBadge[]
  specGroups?: SpecGroup[]
}) {
  const [t, locale] = await Promise.all([getT(), getLocale()])
  const description = productText(product, locale).description
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const detail = productDetail(product)
  const variant =
    product.variants?.length === 1 ? product.variants[0] : undefined
  const warranty = detail?.warranty_months
  // Basics every product has, shown under the template specs.
  const specs = [
    {
      label: t("product.spec_brand"),
      value: productBrand(product)?.name ?? metadata.brand,
    },
    { label: t("product.spec_model_number"), value: detail?.mpn },
    { label: t("product.spec_series"), value: detail?.series },
    { label: t("product.spec_sku"), value: variant?.sku },
    { label: t("product.spec_type"), value: product.type?.value },
    {
      label: t("product.spec_origin_country"),
      value: product.origin_country?.toUpperCase(),
    },
    {
      label: t("product.spec_weight"),
      value: product.weight
        ? t("product.weight_grams", { weight: product.weight })
        : undefined,
    },
    {
      label: t("product.spec_warranty"),
      value: warranty
        ? warranty % 12 === 0
          ? t(
              warranty === 12
                ? "product.warranty_year_one"
                : "product.warranty_years",
              { count: warranty / 12 }
            )
          : t(
              warranty === 1
                ? "product.warranty_month_one"
                : "product.warranty_months",
              { count: warranty }
            )
        : undefined,
    },
  ].filter(
    (s): s is { label: string; value: string } =>
      typeof s.value === "string" && !!s.value
  )

  const sections = [
    description && {
      id: "description",
      title: t("product.section_description"),
      body: (
        <p
          className="whitespace-pre-line leading-8 text-laly-mut"
          data-testid="product-description"
        >
          {description}
        </p>
      ),
    },
    (specGroups.length > 0 || specs.length > 0) && {
      id: "specs",
      title: t("product.section_specs"),
      body: (
        <div className="flex flex-col gap-5">
          {specGroups.length > 0 && <ProductSpecs groups={specGroups} locale={locale} />}
          {specs.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              {specs.map((s) => (
                <div key={s.label} className="contents">
                  <dt className="text-laly-mut">{s.label}</dt>
                  <dd dir="auto" className="font-bold">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ),
    },
    !!detail?.faq?.length && {
      id: "faq",
      title: t("product.section_faq"),
      body: (
        <div
          className="flex flex-col divide-y divide-laly-line"
          data-testid="product-faq"
        >
          {detail.faq.map((f, i) => (
            <details key={i} className="group/faq py-3">
              <summary className="flex items-start justify-between gap-3 cursor-pointer list-none text-sm font-bold">
                {localize(f, "question", locale)}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-laly-teal text-lg leading-none group-open/faq:rotate-45 transition-transform"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-7 text-laly-mut whitespace-pre-line">
                {localize(f, "answer", locale)}
              </p>
            </details>
          ))}
        </div>
      ),
    },
    badges.length > 0 && {
      id: "service",
      title: t("product.section_service"),
      body: (
        <ul className="grid gap-3">
          {badges.map((b) => (
            <li key={b.id} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-[10px] bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
                <Icon name={isIconName(b.icon) ? b.icon : "check"} size={18} />
              </span>
              <span>
                <span className="block text-sm font-bold">
                  {localize(b, "title", locale)}
                </span>
                <span className="block text-xs text-laly-mut">
                  {localize(b, "subtitle", locale)}
                </span>
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
            <Icon
              name="chevr"
              size={18}
              className="rotate-90 group-open:-rotate-90 transition-transform text-laly-mut"
            />
          </summary>
          <div className="px-5 pb-5">{s.body}</div>
        </details>
      ))}
    </div>
  )
}
