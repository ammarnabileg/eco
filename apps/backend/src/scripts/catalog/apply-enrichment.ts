import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

import { FaqEntry } from "../../modules/catalog/specs"
import { updateProductCatalogWorkflow } from "../../workflows/catalog/product-catalog"

type Enrichment = {
  product_id: string
  title_ar: string
  title_en: string
  subtitle_ar?: string
  subtitle_en?: string
  description_ar: string
  description_en: string
  highlights_ar?: string[]
  highlights_en?: string[]
  specs?: Record<string, unknown>
  faq?: FaqEntry[]
  seo_title_ar?: string
  seo_title_en?: string
  seo_description_ar?: string
  seo_description_en?: string
  mpn?: string
  source_url?: string
}

/**
 * Applies reviewed product content (one JSON file per product, the format
 * the enrichment pass writes) to the catalogue: the Arabic title and
 * description on the product, everything else on its catalog detail. Specs
 * are validated against the category templates, so a bad file fails alone.
 *
 *   npx medusa exec ./src/scripts/catalog/apply-enrichment.ts <dir-or-file.json>
 */
export default async function applyEnrichment({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const target = args[0]
  if (!target) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Pass a directory or a JSON file")
  }
  const files = target.endsWith(".json")
    ? [target]
    : readdirSync(target)
        .filter((f) => f.endsWith(".json") && !f.endsWith(".input.json"))
        .map((f) => join(target, f))

  let applied = 0
  for (const file of files) {
    const e = JSON.parse(readFileSync(file, "utf8")) as Enrichment
    try {
      await updateProductCatalogWorkflow(container).run({
        input: {
          product_id: e.product_id,
          detail: {
            title_en: e.title_en,
            subtitle_ar: e.subtitle_ar ?? null,
            subtitle_en: e.subtitle_en ?? null,
            description_en: e.description_en,
            highlights_ar: e.highlights_ar ?? null,
            highlights_en: e.highlights_en ?? null,
            specs: e.specs ?? null,
            faq: e.faq ?? null,
            seo_title_ar: e.seo_title_ar ?? null,
            seo_title_en: e.seo_title_en ?? null,
            seo_description_ar: e.seo_description_ar ?? null,
            seo_description_en: e.seo_description_en ?? null,
            ...(e.mpn ? { mpn: e.mpn } : {}),
            source_url: e.source_url ?? null,
          },
        },
      })
      // The product's own fields carry the Arabic; this also emits
      // product.updated, which re-indexes it for search.
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: e.product_id },
          update: { title: e.title_ar, subtitle: e.subtitle_ar ?? null, description: e.description_ar },
        },
      })
      applied++
      logger.info(`Enrichment: applied ${file}`)
    } catch (error) {
      logger.error(`Enrichment: ${file} not applied: ${(error as Error).message}`)
    }
  }
  logger.info(`Enrichment: ${applied}/${files.length} products updated`)
}
