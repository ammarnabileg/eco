import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { productAttributes } from "../../workflows/catalog/steps/product-attributes"

/**
 * Writes one <handle>.input.json per product for the content pass: current
 * title, brand, model, variants, prices and the spec fields its categories
 * allow. The writer fills <handle>.json from official sources (see
 * docs/CATALOG.md), then apply-enrichment.ts loads them.
 *
 *   ENRICH_CATEGORY=switches [ENRICH_LIMIT=20] [ENRICH_ONLY_EMPTY=1] \
 *     npx medusa exec ./src/scripts/catalog/export-enrichment-inputs.ts <out-dir>
 *   ENRICH_HANDLES=handle-a,handle-b npx medusa exec ... <out-dir>
 */
export default async function exportEnrichmentInputs({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const out = args[0]
  if (!out) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Pass an output directory")
  }
  const handles = process.env.ENRICH_HANDLES?.split(",").map((h) => h.trim()).filter(Boolean)
  const category = process.env.ENRICH_CATEGORY
  const limit = Number(process.env.ENRICH_LIMIT) || 1000
  const onlyEmpty = process.env.ENRICH_ONLY_EMPTY === "1"

  let filters: Record<string, unknown> = {}
  if (handles?.length) {
    filters = { handle: handles }
  } else if (category) {
    const { data: cats } = await query.graph({
      entity: "product_category",
      fields: ["products.id"],
      filters: { handle: category },
    })
    const ids = (cats[0]?.products ?? []).map((p) => p?.id).filter(Boolean)
    filters = { id: ids }
  } else {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Set ENRICH_HANDLES or ENRICH_CATEGORY")
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "title",
      "metadata",
      "categories.handle",
      "options.title",
      "options.values.value",
      "variants.title",
      "variants.sku",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "brand.name",
      "product_detail.mpn",
      "product_detail.series",
      "product_detail.price_on_request",
      "product_detail.description_en",
    ],
    filters,
  })

  mkdirSync(out, { recursive: true })
  let written = 0
  for (const p of products) {
    if (written >= limit) break
    if (onlyEmpty && p.product_detail?.description_en) continue
    const input = {
      handle: p.handle,
      current_title: p.title,
      category: (p.categories ?? []).map((c) => c?.handle),
      brand: p.brand?.name ?? null,
      mpn: p.product_detail?.mpn ?? null,
      series: p.product_detail?.series ?? null,
      price_on_request: Boolean(p.product_detail?.price_on_request),
      variants: (p.variants ?? []).map((v) => ({
        title: v?.title,
        sku: v?.sku,
        // prices come through the variant's price set link
        price_kwd:
          ((v as { prices?: { amount: number; currency_code: string }[] } | null)?.prices ?? []).find(
            (pr) => pr.currency_code === "kwd"
          )?.amount ?? null,
      })),
      options: (p.options ?? []).map((o) => ({ title: o?.title, values: (o?.values ?? []).map((v) => v?.value) })),
      old_url: (p.metadata as Record<string, unknown> | null)?.old_url ?? null,
      spec_fields: await productAttributes(container, p.id),
    }
    writeFileSync(join(out, `${p.handle.slice(0, 80)}.input.json`), JSON.stringify(input, null, 1))
    written++
  }
  logger.info(`Enrichment: wrote ${written} input file(s) to ${out}`)
}
