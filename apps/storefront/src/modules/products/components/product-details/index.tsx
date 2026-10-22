import { getLocale, getT } from "@i18n/server"
import { getStoreContent, TrustBadge } from "@lib/data/content"
import { productBrand, productDetail, SpecGroup } from "@lib/util/catalog"
import { localize } from "@lib/util/localize"
import { HttpTypes } from "@medusajs/types"
import Icon, { isIconName } from "@modules/laly/components/icon"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductSpecs from "@modules/products/components/product-specs"
import ProductTabs, {
  ProductTab,
} from "@modules/products/components/product-tabs"
import { productText } from "@modules/products/lib/product-text"

// Policy pages linked from the warranty tab, once published in the admin.
const POLICY_PAGES = ["warranty", "shipping-policy", "return-policy"]

// The product's tabs: overview (description, highlights, FAQ),
// specifications, what is in the box (only when entered), and the store's
// commitments (warranty, returns, delivery) from the admin-managed trust
// badges plus links to the published policy pages.
export default async function ProductDetails({
  product,
  badges,
  specGroups = [],
}: {
  product: HttpTypes.StoreProduct
  badges: TrustBadge[]
  specGroups?: SpecGroup[]
}) {
  const [t, locale, { pages = [] }] = await Promise.all([
    getT(),
    getLocale(),
    getStoreContent(),
  ])
  const { description, highlights, boxContents } = productText(product, locale)
  const policies = POLICY_PAGES.flatMap((slug) =>
    pages.filter((p) => p.slug === slug)
  )
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

  const faq = detail?.faq?.length ? (
    <section className="flex flex-col gap-1">
      <h2 className="text-base font-extrabold">{t("product.section_faq")}</h2>
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
    </section>
  ) : null

  const tabs = [
    (description || highlights.length > 0 || faq) && {
      id: "overview",
      title: t("product.tab_overview"),
      body: (
        <div className="flex flex-col gap-6">
          {highlights.length > 0 && (
            <section>
              <h2 className="sr-only">{t("product.section_highlights")}</h2>
              <ul
                className="grid gap-2 text-sm"
                data-testid="product-highlights"
              >
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <Icon
                      name="check"
                      size={16}
                      className="mt-0.5 shrink-0 text-laly-teal"
                    />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {description && (
            <section>
              <h2 className="sr-only">{t("product.section_description")}</h2>
              <p
                className="whitespace-pre-line leading-8 text-laly-mut"
                data-testid="product-description"
              >
                {description}
              </p>
            </section>
          )}
          {faq}
        </div>
      ),
    },
    (specGroups.length > 0 || specs.length > 0) && {
      id: "specs",
      title: t("product.tab_specs"),
      body: (
        <div className="flex flex-col gap-5">
          {specGroups.length > 0 && (
            <ProductSpecs groups={specGroups} locale={locale} />
          )}
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
    boxContents.length > 0 && {
      id: "box",
      title: t("product.tab_box"),
      body: (
        <ul
          className="grid gap-2 small:grid-cols-2 text-sm"
          data-testid="product-box-contents"
        >
          {boxContents.map((item, i) => (
            <li
              key={`${i}-${item}`}
              className="flex items-center gap-2.5 rounded-[12px] bg-laly-bg px-3 py-2.5"
            >
              <Icon
                name="check"
                size={16}
                className="shrink-0 text-laly-teal"
              />
              <span dir="auto">{item}</span>
            </li>
          ))}
        </ul>
      ),
    },
    (badges.length > 0 || policies.length > 0) && {
      id: "service",
      title: t("product.tab_service"),
      body: (
        <div className="flex flex-col gap-5">
          {badges.length > 0 && (
            <ul className="grid gap-3 small:grid-cols-2">
              {badges.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[10px] bg-laly-teal-soft text-laly-teal flex items-center justify-center shrink-0">
                    <Icon
                      name={isIconName(b.icon) ? b.icon : "check"}
                      size={18}
                    />
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
          )}
          {policies.length > 0 && (
            <nav aria-label={t("product.policy_links_label")}>
              <ul
                className="flex flex-wrap gap-2 text-sm"
                data-testid="product-policy-links"
              >
                {policies.map((p) => (
                  <li key={p.slug}>
                    <LocalizedClientLink
                      href={`/${p.slug}`}
                      className="inline-flex items-center gap-1 rounded-full border border-laly-line px-3 py-1.5 font-bold text-laly-teal hover:bg-laly-teal-soft"
                    >
                      {localize(p, "title", locale)}
                      <Icon
                        name="chevr"
                        size={14}
                        className="rtl:-scale-x-100"
                      />
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      ),
    },
  ].filter(Boolean) as ProductTab[]

  return <ProductTabs tabs={tabs} label={t("product.tabs_label")} />
}
