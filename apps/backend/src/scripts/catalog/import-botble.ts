import { readFileSync, writeFileSync } from "node:fs"

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

import { CATALOG_MODULE } from "../../modules/catalog"
import CatalogModuleService from "../../modules/catalog/service"
import { updateProductCatalogWorkflow } from "../../workflows/catalog/product-catalog"
import { groupProducts, parseCsv, ProductDraft, richness, toDraft } from "./botble"

/**
 * Imports a Botble product export into Laly.
 *
 *   [IMPORT_DRY_RUN=1] [IMPORT_ONLY=id,id] [IMPORT_REPORT=path] \
 *     npx medusa exec ./src/scripts/catalog/import-botble.ts <file.csv>
 *
 * (medusa exec rejects --flags, so options come from the environment.)
 *
 * Run setup-catalog.ts first. Products are matched by handle (the old slug,
 * kept for SEO), so re-running only creates what is missing and never
 * overwrites a product that was edited or enriched since. Titles stay in
 * English until the content pass writes Arabic; price 0 becomes
 * price-on-request; stock is not tracked yet (Botble had no quantities).
 */
// Rows the rules cannot tell apart from a different product, checked by hand.
const KNOWN_DUPLICATES: Record<string, string> = {
  "340": "same product as 650 (Tapo C246D) with a wrong SKU",
}

export default async function importBotble({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const file = args[0]
  if (!file) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Pass the CSV path as the first argument")
  }
  const dryRun = process.env.IMPORT_DRY_RUN === "1"
  const only = process.env.IMPORT_ONLY?.split(",").map((s) => s.trim())
  const reportPath = process.env.IMPORT_REPORT

  const groups = groupProducts(parseCsv(readFileSync(file, "utf8")))
  // Rows listed twice (same brand, title and model, or same slug) collapse
  // into the richest one: more variations and images, a model, a price.
  // One model under two different titles is left alone and reported.
  const best = new Map<string, (typeof groups)[number]>()
  const keysOf = (g: (typeof groups)[number]) => {
    const d = toDraft(g)
    return [`${d.brand}|${d.title}|${d.mpn}`.toLowerCase(), `handle|${d.handle}`]
  }
  const duplicates: string[] = []
  for (const g of groups) {
    if (KNOWN_DUPLICATES[g.row.ID]) {
      duplicates.push(`${g.row.ID} ${g.row.Name} (${KNOWN_DUPLICATES[g.row.ID]})`)
      continue
    }
    const keys = keysOf(g)
    const rival = keys.map((k) => best.get(k)).find(Boolean)
    if (rival) {
      const [keep, drop] = richness(g) > richness(rival) ? [g, rival] : [rival, g]
      duplicates.push(`${drop.row.ID} ${drop.row.Name} (kept ${keep.row.ID})`)
      for (const [k, v] of [...best.entries()]) if (v === rival) best.delete(k)
      keysOf(keep).forEach((k) => best.set(k, keep))
    } else {
      keys.forEach((k) => best.set(k, g))
    }
  }
  const drafts = [...new Set(best.values())]
    .sort((a, b) => Number(a.row.ID) - Number(b.row.ID))
    .map(toDraft)
  const report = {
    total: groups.length,
    excluded: [] as string[],
    unmapped: [] as string[],
    duplicates,
    existing: 0,
    created: 0,
    by_category: {} as Record<string, number>,
    by_brand: {} as Record<string, number>,
    price_on_request: 0,
    without_mpn: [] as string[],
    model_conflicts: [] as string[],
  }

  const wanted: ProductDraft[] = []
  for (const d of drafts) {
    if (only && !only.includes(d.botble_id)) continue
    if (d.category === null) {
      report.excluded.push(d.title)
      continue
    }
    if (d.category === "unmapped") {
      report.unmapped.push(d.title)
      continue
    }
    wanted.push(d)
    report.by_category[d.category] = (report.by_category[d.category] ?? 0) + 1
    report.by_brand[d.brand ?? "none"] = (report.by_brand[d.brand ?? "none"] ?? 0) + 1
    if (d.price_on_request) report.price_on_request++
    if (!d.mpn) report.without_mpn.push(d.title)
  }

  const byModel = new Map<string, ProductDraft[]>()
  wanted.forEach((d) => d.mpn && byModel.set(`${d.brand}|${d.mpn}`.toLowerCase(), [...(byModel.get(`${d.brand}|${d.mpn}`.toLowerCase()) ?? []), d]))
  for (const list of byModel.values()) {
    if (list.length > 1) {
      report.model_conflicts.push(list.map((d) => `${d.botble_id} ${d.title}`).join("  <>  "))
    }
  }

  const productModule = container.resolve(Modules.PRODUCT)
  const catalog = container.resolve<CatalogModuleService>(CATALOG_MODULE)
  const categories = await productModule.listProductCategories({}, { select: ["id", "handle"] })
  const categoryId = new Map(categories.map((c) => [c.handle, c.id]))
  const brands = await catalog.listBrands({})
  const brandId = new Map(brands.map((b) => [b.handle, b.id]))
  const missing = [...new Set(wanted.map((d) => d.category!))].filter((h) => !categoryId.has(h))
  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Categories missing (run setup-catalog.ts first): ${missing.join(", ")}`
    )
  }

  const existing = new Set(
    (await productModule.listProducts({ handle: wanted.map((d) => d.handle) }, { select: ["handle"] })).map(
      (p) => p.handle
    )
  )
  const todo = wanted.filter((d) => !existing.has(d.handle))
  report.existing = wanted.length - todo.length

  // SKUs are unique in Medusa; the export repeats some part numbers.
  const usedSkus = new Set<string>()
  const uniqueSku = (sku: string | null) => {
    if (!sku) return undefined
    let candidate = sku
    for (let n = 2; usedSkus.has(candidate.toLowerCase()); n++) candidate = `${sku}-${n}`
    usedSkus.add(candidate.toLowerCase())
    return candidate
  }

  if (!dryRun && todo.length) {
    const [salesChannel] = await container
      .resolve(Modules.SALES_CHANNEL)
      .listSalesChannels({ name: "Laly Online" })
    const [shippingProfile] = await container
      .resolve(Modules.FULFILLMENT)
      .listShippingProfiles({ type: "default" })
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: taken } = await query.graph({ entity: "variant", fields: ["sku"] })
    taken.forEach((v) => v.sku && usedSkus.add(v.sku.toLowerCase()))

    for (let i = 0; i < todo.length; i += 25) {
      const batch = todo.slice(i, i + 25)
      const { result } = await createProductsWorkflow(container).run({
        input: {
          products: batch.map((d) => ({
            title: d.title,
            handle: d.handle,
            status: ProductStatus.PUBLISHED,
            external_id: `botble-${d.botble_id}`,
            thumbnail: d.thumbnail ?? undefined,
            images: d.images.map((url) => ({ url })),
            category_ids: [categoryId.get(d.category!)!],
            sales_channels: salesChannel ? [{ id: salesChannel.id }] : undefined,
            shipping_profile_id: shippingProfile?.id,
            options: d.options.length
              ? d.options
              : [{ title: "Default option", values: ["Default option value"] }],
            variants: d.variants.map((v) => ({
              title: v.title,
              sku: uniqueSku(v.sku),
              manage_inventory: false,
              variant_rank: v.rank,
              options: d.options.length ? v.options : { "Default option": "Default option value" },
              prices: v.price === null ? [] : [{ amount: v.price, currency_code: "kwd" }],
            })),
            metadata: {
              botble_id: d.botble_id,
              old_url: d.old_url,
              botble_categories: d.old_categories,
              botble_labels: d.labels.join(", ") || null,
              botble_collections: d.collections.join(", ") || null,
            },
          })),
        },
      })
      for (const product of result) {
        const d = batch.find((x) => x.handle === product.handle)!
        await updateProductCatalogWorkflow(container).run({
          input: {
            product_id: product.id,
            brand_id: d.brand ? (brandId.get(d.brand) ?? null) : null,
            detail: {
              title_en: d.title,
              mpn: d.mpn,
              series: d.series,
              price_on_request: d.price_on_request,
            },
          },
        })
      }
      report.created += result.length
      logger.info(`Import: ${report.created}/${todo.length} products created`)
    }
  }

  const summary = {
    ...report,
    excluded: report.excluded.length,
    unmapped: report.unmapped,
    duplicates: report.duplicates.length,
    without_mpn: report.without_mpn.length,
    model_conflicts: report.model_conflicts.length,
    dry_run: dryRun,
  }
  logger.info(`Import summary: ${JSON.stringify(summary)}`)
  if (reportPath) {
    writeFileSync(reportPath, JSON.stringify({ ...report, dry_run: dryRun }, null, 2))
  }
}
